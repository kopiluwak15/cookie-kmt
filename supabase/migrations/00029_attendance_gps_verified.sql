-- ============================================
-- 00029 attendance GPS検証カラム追加
-- 既存コードが checkin_gps_verified / checkout_gps_verified を参照しているが
-- カラムが存在しないため追加
-- ============================================

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS checkin_gps_verified boolean,
  ADD COLUMN IF NOT EXISTS checkout_gps_verified boolean;
