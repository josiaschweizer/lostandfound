-- =============================================================================
-- Storage: Fotos von Funden
-- Pfad: <organisation_id>/<zufällige uuid>.jpg (nicht erratbar). Hochladen, ersetzen und löschen
-- nur Mitarbeitende der eigenen Fundstelle. Das Frontend verkleinert Fotos vor dem Upload auf
-- max. 1600 px und speichert sie neu als JPEG – dabei gehen EXIF-Daten (z. B. GPS) verloren.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "item-photos: eigene Fundstelle hochladen"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );

create policy "item-photos: eigene Fundstelle ersetzen"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );

create policy "item-photos: eigene Fundstelle löschen"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );
