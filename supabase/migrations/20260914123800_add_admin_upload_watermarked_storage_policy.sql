CREATE POLICY "Admins can upload watermarked" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'watermarked'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
