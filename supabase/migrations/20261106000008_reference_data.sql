-- =============================================================================
-- Nachschlagedaten für Matching und Suche (kein Demo-Inhalt, bleibt beim Reset bestehen)
-- =============================================================================

-- Farbgruppen (KONZEPT 6.3) – symmetrisch abgelegt
insert into public.color_relations (color, related)
select c, r from (values
  ('black', 'grey'),
  ('grey', 'silver'), ('grey', 'white'),
  ('white', 'silver'), ('white', 'beige'),
  ('beige', 'brown'),
  ('red', 'pink'), ('red', 'orange'),
  ('pink', 'violet'),
  ('orange', 'yellow'),
  ('yellow', 'gold'),
  ('green', 'turquoise'),
  ('blue', 'turquoise'), ('blue', 'violet')
) as pairs(a, b)
cross join lateral (values (a::public.item_color, b::public.item_color), (b::public.item_color, a::public.item_color)) as x(c, r)
on conflict do nothing;

-- Lokale Synonyme (KONZEPT 7.3). Gespeichert wie angezeigt; die Suche normalisiert selbst (ä = ae).
insert into public.search_synonyms (group_id, term)
select g, t
  from (values
    (1, array['Jacke', 'Winterjacke', 'Regenjacke', 'Mantel', 'Windjacke', 'Daunenjacke', 'Softshelljacke', 'Kinderjacke']),
    (2, array['Handy', 'Smartphone', 'Telefon', 'iPhone', 'Natel', 'Mobiltelefon']),
    (3, array['Kopfhörer', 'Ohrhörer', 'AirPods', 'Earbuds', 'Headset']),
    (4, array['Portemonnaie', 'Portmonee', 'Geldbeutel', 'Brieftasche', 'Börse', 'Wallet']),
    (5, array['Schlüssel', 'Schlüsselbund', 'Hausschlüssel', 'Veloschlüssel']),
    (6, array['Trinkflasche', 'Flasche', 'Wasserflasche']),
    (7, array['Brille', 'Sonnenbrille', 'Lesebrille']),
    (8, array['Mütze', 'Kappe', 'Beanie', 'Cap']),
    (9, array['Rucksack', 'Tasche', 'Turnbeutel', 'Schulsack']),
    (10, array['Schirm', 'Regenschirm', 'Taschenschirm', 'Stockschirm']),
    (11, array['Pulli', 'Pullover', 'Hoodie', 'Sweatshirt', 'Kapuzenpullover']),
    (12, array['Ausweis', 'ID', 'Karte', 'Abo', 'GA', 'Identitätskarte', 'Abo-Karte']),
    (13, array['Uhr', 'Armbanduhr', 'Smartwatch']),
    (14, array['Ladegerät', 'Ladekabel', 'Netzteil', 'Kabel']),
    (15, array['Laptop', 'Notebook', 'Tablet', 'iPad'])
  ) as groups(g, terms)
  cross join lateral unnest(terms) as t
on conflict do nothing;
