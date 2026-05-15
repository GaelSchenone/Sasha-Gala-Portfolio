-- Migration: Add cloudinary_public_id column to images table
-- Run this manually on your Dokploy MariaDB instance

ALTER TABLE images ADD COLUMN cloudinary_public_id VARCHAR(255) DEFAULT NULL AFTER img_route;

-- After migration, existing rows with /imgs/ paths will have cloudinary_public_id = NULL.
-- New uploads will have both img_route (full Cloudinary URL) and cloudinary_public_id set.
-- To clean up legacy images, re-upload them through the admin panel after deploying.
