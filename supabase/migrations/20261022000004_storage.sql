-- =============================================================================
-- Storage: Fotos von Fundgegenständen
-- Pfad: <organisation_id>/<datei>. Öffentlich lesbar (Katalog), schreiben nur
-- Mitarbeitende der eigenen Organisation.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "item-photos: eigene Organisation hochladen"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );

create policy "item-photos: eigene Organisation ersetzen"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );

create policy "item-photos: eigene Organisation löschen"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );
