-- 施術ログに来店・退店時刻と施術料金を追加
ALTER TABLE visit_history
  ADD COLUMN checkin_at timestamptz,
  ADD COLUMN checkout_at timestamptz,
  ADD COLUMN price integer;

-- 滞在時間（分）を計算するヘルパー関数
CREATE OR REPLACE FUNCTION calc_duration_minutes(checkin timestamptz, checkout timestamptz)
RETURNS integer AS $$
BEGIN
  IF checkin IS NULL OR checkout IS NULL THEN RETURN NULL; END IF;
  RETURN EXTRACT(EPOCH FROM (checkout - checkin)) / 60;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
