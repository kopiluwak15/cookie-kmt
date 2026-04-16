-- スタッフ向け通知ログ（退勤時の施術ログ未入力警告など）
CREATE TABLE IF NOT EXISTS staff_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,          -- 'pending_visitlog' など
  date date NOT NULL DEFAULT CURRENT_DATE,
  message text NOT NULL,
  target_staff_ids uuid[] DEFAULT '{}',     -- 送信先スタッフID
  sent_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  detail jsonb DEFAULT '{}',                -- 送信結果詳細
  created_at timestamptz DEFAULT now()
);

-- 同日・同タイプの重複送信防止用
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_notification_log_type_date
  ON staff_notification_log (notification_type, date);
