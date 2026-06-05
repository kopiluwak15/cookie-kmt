-- 00039: 打刻WiFi(IP)許可と打刻経路の記録
-- 目的:
--  ① 携帯から「店舗WiFi接続中」で打刻するため、店舗ごとに許可IPを登録
--  ② 打刻が ①WiFi / ②QR+GPS / ③タブレット のどれで行われたか記録
--  ③ タブレット打刻は応急処置なので「理由」を必須化（プリセット5＋自由記述）
--     乱用検知のため admin 画面で頻度可視化する

-- ===== store テーブル: WiFi(IP)許可リスト =====
ALTER TABLE store ADD COLUMN IF NOT EXISTS timecard_wifi_enabled boolean DEFAULT false;

-- timecard_allowed_ips: 許可IPの配列（jsonb）
-- 形式: [{"ip":"153.x.x.x","label":"店舗光","registered_at":"2026-05-23T10:00:00Z","last_seen_at":"2026-05-23T10:00:00Z"}]
-- 動的IPでも複数件登録できるよう配列で持つ
ALTER TABLE store ADD COLUMN IF NOT EXISTS timecard_allowed_ips jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN store.timecard_wifi_enabled IS '打刻時に許可IPによる検証を行うか';
COMMENT ON COLUMN store.timecard_allowed_ips IS '許可するクライアントIPのリスト（動的IP対策で複数登録可）';

-- ===== attendance テーブル: 打刻経路と理由 =====
-- via:
--   'line_wifi' = ①LINE(LIFF)からWiFi(IP)一致で打刻
--   'line_gps'  = ②LINE(LIFF)からGPS一致で打刻（既存QR経路）
--   'tablet'    = ③店舗タブレットからPIN+理由で打刻
--   null        = レガシー / 不明（既存データ）
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkin_via text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_via text;

-- タブレット打刻の理由（プリセットキー + 自由記述）
-- preset: 'forgot' | 'battery' | 'broken' | 'line_error' | 'wifi_trouble' | 'other'
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkin_reason_preset text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkin_reason_text text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_reason_preset text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_reason_text text;

COMMENT ON COLUMN attendance.checkin_via IS '出勤打刻経路: line_wifi / line_gps / tablet / null';
COMMENT ON COLUMN attendance.checkout_via IS '退勤打刻経路: line_wifi / line_gps / tablet / null';
COMMENT ON COLUMN attendance.checkin_reason_preset IS 'タブレット打刻時の理由プリセット（forgot/battery/broken/line_error/wifi_trouble/other）';
COMMENT ON COLUMN attendance.checkin_reason_text IS 'タブレット打刻時の理由自由記述（preset=other 必須、その他は任意補足）';

-- ===== staff テーブル: タブレット打刻用 PIN =====
-- 既存の admin PIN (global_settings) とは別、本人のスタッフPIN（4桁英数）
ALTER TABLE staff ADD COLUMN IF NOT EXISTS timecard_pin_hash text;

COMMENT ON COLUMN staff.timecard_pin_hash IS 'タブレット打刻用PIN（SHA-256+pepper）。本人がマイページで設定';

-- インデックス: by-month で「今月タブレット打刻何回か」を集計するため
CREATE INDEX IF NOT EXISTS idx_attendance_checkin_via ON attendance(checkin_via) WHERE checkin_via IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_checkout_via ON attendance(checkout_via) WHERE checkout_via IS NOT NULL;
