-- ============================================
-- 00035 staff テーブルに美容師免許画像パスを追加
-- ============================================

ALTER TABLE staff ADD COLUMN IF NOT EXISTS license_image_path text;
