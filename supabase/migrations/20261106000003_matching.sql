-- =============================================================================
-- Matching v2 (KONZEPT Abschnitt 6) – regelbasiert, nachvollziehbar, nur Vorschläge.
--
-- Harte Bedingungen: gleiche Kategorie · Fund verfügbar/reserviert · Fundstelle passt
-- (oder «Weiss nicht») · Funddatum zwischen verloren_von − 3 und verloren_bis + 30 Tagen ·
-- Farbausschluss (keine gleiche oder verwandte Farbe → kein Treffer).
-- Punkte: gleiche Farbe +3 · verwandte Farbe +1 · gleiche Marke +3 · gemeinsames Stichwort
-- +1 (max. +3) · Ort +1 · zeitlich nah (±3 Tage) +1. Jeder Punkt hat ein Begründungs-Kürzel.
-- =============================================================================

-- Kleinbuchstaben, Umlaute ausschreiben (ä → ae), Akzente entfernen.
create function public.normalize_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    replace(replace(replace(replace(replace(replace(replace(
      lower(coalesce(p_text, '')),
      'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'Ä', 'ae'), 'Ö', 'oe'), 'Ü', 'ue'), 'ß', 'ss'),
    'àáâãåèéêëìíîïòóôõùúûñçÀÁÂÈÉÊÌÍÎÒÓÔÙÚÛÇ',
    'aaaaaeeeeiiiioooouuuncaaaeeeiiiooouuuc');
$$;

-- Einfache Pluralform kürzen (Endungen -en, -e, -n, -s), damit «Jacken» und «Jacke» gleich sind.
create function public.stem_word(p_word text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(p_word) > 4 and p_word like '%en' then left(p_word, -2)
    when length(p_word) > 3 and (p_word like '%e' or p_word like '%n' or p_word like '%s') then left(p_word, -1)
    else p_word
  end;
$$;

create function public.is_stopword(p_word text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_word = any (array[
    'der', 'die', 'das', 'ein', 'eine', 'einer', 'einem', 'einen', 'den', 'dem', 'des', 'mit', 'ohne',
    'und', 'oder', 'von', 'vom', 'im', 'am', 'in', 'an', 'auf', 'bei', 'beim', 'fuer', 'aus', 'zu', 'zum',
    'zur', 'ist', 'sind', 'war', 'nicht', 'sehr', 'mein', 'meine', 'meinen', 'meiner', 'dein', 'deine',
    'ich', 'habe', 'hab', 'hat', 'ca', 'etwa', 'innen', 'aussen', 'noch', 'auch', 'nur', 'wie', 'irgendwo',
    'the', 'and', 'with'
  ])
  -- Farbwörter zählen nicht als Stichwort – die Farbe wird separat bewertet.
  or p_word ~ '^(schwarz|weiss|grau|blau|rot|gruen|gelb|braun|rosa|pink|orange|violett|lila|tuerkis|beige|silber|gold|golden|dunkel|hell|bunt|mehrfarbig|dunkelblau|hellblau)(e|er|es|en|em)?$';
$$;

-- Stichwörter eines Textes: normalisierter Wortstamm + erstes Originalwort (für die Begründung).
create function public.text_keywords(p_text text)
returns table (stem text, word text)
language sql
immutable
set search_path = ''
as $$
  select distinct on (k.stem) k.stem, k.word
    from (
      select w.word,
             public.stem_word(public.normalize_text(w.word)) as stem,
             public.normalize_text(w.word) as norm,
             w.ord
        from regexp_split_to_table(coalesce(p_text, ''), '[^a-zA-Z0-9äöüÄÖÜßàáâèéêëìíîïòóôùúûñçÀÁÂÈÉÊÌÍÎÒÓÔÙÚÛÇ]+')
             with ordinality as w(word, ord)
       where w.word <> ''
    ) k
   where length(k.stem) >= 3 and not public.is_stopword(k.norm)
   order by k.stem, k.ord;
$$;

-- -----------------------------------------------------------------------------
-- Kern: bewertet einen Fund gegenüber einer (gespeicherten oder entworfenen) Verlustmeldung.
-- Liefert keine Zeile, wenn eine harte Bedingung verletzt ist.
-- -----------------------------------------------------------------------------
create function public.match_eval(
  r_organisation_id uuid,
  r_title           text,
  r_category        public.item_category,
  r_colors          public.item_color[],
  r_brand           text,
  r_description     text,
  r_location        text,
  r_from            date,
  r_to              date,
  i                 public.found_items
)
returns table (score integer, reasons text[])
language plpgsql
stable
set search_path = ''
as $$
declare
  v_score     integer := 0;
  v_reasons   text[] := '{}';
  v_colors    public.item_color[] := coalesce(r_colors, '{}');
  v_same      boolean := false;
  v_related   boolean := false;
  v_words     text[];
begin
  if i.status not in ('available', 'reserved') then return; end if;
  if i.category <> r_category then return; end if;
  if r_organisation_id is not null and i.organisation_id <> r_organisation_id then return; end if;
  if i.found_on < r_from - 3 or i.found_on > r_to + 30 then return; end if;

  -- Farben: gleich, verwandt oder Ausschluss (fehlende Farbe oder «mehrfarbig» schränkt nicht ein)
  if cardinality(v_colors) > 0 then
    v_same := v_colors && i.colors;
    if not v_same then
      v_related := exists (
        select 1 from public.color_relations cr
         where cr.color = any (v_colors) and cr.related = any (i.colors));
      if not v_related and not ('multicolor' = any (v_colors) or 'multicolor' = any (i.colors)) then
        return;
      end if;
    end if;
  end if;

  if v_same then
    v_score := v_score + 3; v_reasons := array_append(v_reasons, 'farbe_gleich');
  elsif v_related then
    v_score := v_score + 1; v_reasons := array_append(v_reasons, 'farbe_aehnlich');
  end if;

  if nullif(public.normalize_text(trim(r_brand)), '') = nullif(public.normalize_text(trim(i.brand)), '') then
    v_score := v_score + 3; v_reasons := array_append(v_reasons, 'marke_gleich');
  end if;

  -- Gemeinsame Stichwörter aus Titel/Beschreibung, höchstens 3 (Wort aus dem Fund für die Anzeige)
  select array_agg(f.word order by f.word) into v_words
    from (
      select fk.word
        from public.text_keywords(i.title || ' ' || i.public_description) fk
       where fk.stem in (select rk.stem from public.text_keywords(coalesce(r_title, '') || ' ' || coalesce(r_description, '')) rk)
       limit 3
    ) f;
  if v_words is not null then
    v_score := v_score + cardinality(v_words);
    v_reasons := v_reasons || array(select 'stichwort:' || w from unnest(v_words) w);
  end if;

  if exists (
    select 1 from public.text_keywords(i.found_location) fk
     where fk.stem in (select rk.stem from public.text_keywords(r_location) rk)
  ) then
    v_score := v_score + 1; v_reasons := array_append(v_reasons, 'ort');
  end if;

  if i.found_on between r_from - 3 and r_to + 3 then
    v_score := v_score + 1; v_reasons := array_append(v_reasons, 'datum_nah');
  end if;

  return query select v_score, v_reasons;
end;
$$;

-- Treffer (Funde) zu einer Meldung. Intern; öffentlich nur über die Wrapper unten bzw. get_my_loss.
create function public.match_items(
  r_organisation_id uuid,
  r_title           text,
  r_category        public.item_category,
  r_colors          public.item_color[],
  r_brand           text,
  r_description     text,
  r_location        text,
  r_from            date,
  r_to              date,
  p_public_only     boolean,
  p_min_score       integer,
  p_limit           integer
)
returns table (item_id uuid, score integer, reasons text[])
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, m.score, m.reasons
    from public.found_items i
    cross join lateral public.match_eval(r_organisation_id, r_title, r_category, r_colors, r_brand,
                                         r_description, r_location, r_from, r_to, i) m
   where m.score >= p_min_score
     and (not p_public_only or i.is_public)
   order by m.score desc, i.found_on desc, i.created_at desc
   limit p_limit;
$$;

-- Öffentliche Angaben eines Treffers (gleiche Spalten wie public_items + Fundstelle).
create function public.public_match_json(p_item_id uuid, p_score integer, p_reasons text[], p_with_score boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'itemNumber', i.item_number, 'title', i.title, 'category', i.category,
    'colors', to_jsonb(i.colors), 'brand', i.brand, 'foundOn', i.found_on,
    'foundLocation', i.found_location, 'publicDescription', i.public_description,
    'photoPath', i.photo_path, 'status', i.status,
    'organisationId', o.id, 'organisationName', o.name, 'organisationSlug', o.slug,
    'reasons', to_jsonb(p_reasons)
  ) || case when p_with_score then jsonb_build_object('score', p_score) else '{}'::jsonb end
    from public.found_items i
    join public.organisations o on o.id = i.organisation_id
   where i.id = p_item_id;
$$;

revoke all on function public.match_eval(uuid, text, public.item_category, public.item_color[], text, text, text, date, date, public.found_items) from public, anon, authenticated;
revoke all on function public.match_items(uuid, text, public.item_category, public.item_color[], text, text, text, date, date, boolean, integer, integer) from public, anon, authenticated;
revoke all on function public.public_match_json(uuid, integer, text[], boolean) from public, anon, authenticated;
