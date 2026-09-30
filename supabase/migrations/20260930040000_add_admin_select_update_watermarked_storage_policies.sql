-- Storage uploads return the inserted row (needs SELECT), and upsert: true
-- runs INSERT ... ON CONFLICT DO UPDATE (needs SELECT + UPDATE). The INSERT-only
-- policy added earlier is not enough for admin draft uploads.
CREATE POLICY "Admins can view watermarked" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'watermarked'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update watermarked" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'watermarked'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'watermarked'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
