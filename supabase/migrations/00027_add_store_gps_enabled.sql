-- ============================================
-- 00027 store.gps_enabled
-- タイムカードのGPS検証機能のON/OFFを店舗単位で管理
-- 既存店舗はデフォルトONで開始
-- ============================================

ALTER TABLE store
  ADD COLUMN IF NOT EXISTS gps_enabled boolean NOT NULL DEFAULT true;
