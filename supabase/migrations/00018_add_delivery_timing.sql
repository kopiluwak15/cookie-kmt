-- お知らせに配信タイミングを追加
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS delivery_timing TEXT DEFAULT 'check_in'
  CHECK (delivery_timing IN ('check_in', 'check_out'));

-- テンプレートにも配信タイミングを追加
ALTER TABLE announcement_templates ADD COLUMN IF NOT EXISTS delivery_timing TEXT DEFAULT 'check_out'
  CHECK (delivery_timing IN ('check_in', 'check_out'));
