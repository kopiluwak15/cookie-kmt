-- ============================================
-- COOKIE for MEN CRM - データベーススキーマ
-- ============================================

-- スタッフテーブル
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- スタイル設定テーブル
CREATE TABLE style_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_name text UNIQUE NOT NULL,
  base_cycle_days integer NOT NULL DEFAULT 28,
  reminder1_days integer NOT NULL DEFAULT 21,
  reminder2_days integer NOT NULL DEFAULT 35,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 顧客テーブル
CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE,
  name text NOT NULL,
  name_kana text,
  line_user_id text UNIQUE,
  phone text,
  email text,
  birthday date,
  notes text,
  individual_cycle_days integer,
  first_visit_date date,
  last_visit_date date,
  total_visits integer DEFAULT 0,
  line_blocked boolean DEFAULT false,
  line_friend_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 施術履歴テーブル
CREATE TABLE visit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  service_menu text NOT NULL,
  style_category_id uuid NOT NULL REFERENCES style_settings(id),
  staff_name text NOT NULL,
  visit_cycle_days integer,
  notes text,
  thank_you_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- LINE送信履歴テーブル
CREATE TABLE line_message_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  visit_history_id uuid REFERENCES visit_history(id) ON DELETE SET NULL,
  message_type text NOT NULL CHECK (message_type IN ('thank_you', 'reminder1', 'reminder2', 'dormant')),
  sent_at timestamptz DEFAULT now(),
  line_request_id text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'blocked')),
  error_message text
);

-- LINEテンプレート設定テーブル
CREATE TABLE line_template_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL CHECK (template_type IN ('thank_you', 'reminder1', 'reminder2', 'dormant')),
  title text NOT NULL,
  body_text text NOT NULL,
  coupon_text text,
  booking_url text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- グローバル設定テーブル
CREATE TABLE global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 予約履歴テーブル
CREATE TABLE reservation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  reserved_at timestamptz DEFAULT now(),
  visit_date date,
  status text DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'cancelled', 'no_show')),
  source text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- インデックス
-- ============================================
CREATE INDEX idx_customer_line_user_id ON customer(line_user_id);
CREATE INDEX idx_customer_phone ON customer(phone);
CREATE INDEX idx_customer_name_kana ON customer(name_kana);
CREATE INDEX idx_customer_last_visit ON customer(last_visit_date);
CREATE INDEX idx_visit_history_customer ON visit_history(customer_id);
CREATE INDEX idx_visit_history_date ON visit_history(visit_date);
CREATE INDEX idx_line_history_customer ON line_message_history(customer_id);
CREATE INDEX idx_line_history_type ON line_message_history(message_type);
CREATE INDEX idx_line_history_sent_at ON line_message_history(sent_at);

-- ============================================
-- トリガー関数
-- ============================================

-- 顧客コード自動生成
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 3) AS integer)), 0) + 1
  INTO next_num FROM customer;
  NEW.customer_code := 'C-' || LPAD(next_num::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_customer_code
BEFORE INSERT ON customer
FOR EACH ROW
WHEN (NEW.customer_code IS NULL)
EXECUTE FUNCTION generate_customer_code();

-- 施術ログ挿入時に顧客情報を更新
CREATE OR REPLACE FUNCTION update_customer_on_visit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customer
  SET
    last_visit_date = GREATEST(last_visit_date, NEW.visit_date),
    total_visits = total_visits + 1,
    first_visit_date = COALESCE(first_visit_date, NEW.visit_date),
    updated_at = now()
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_on_visit
AFTER INSERT ON visit_history
FOR EACH ROW EXECUTE FUNCTION update_customer_on_visit();

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_updated_at
BEFORE UPDATE ON customer
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_template_updated_at
BEFORE UPDATE ON line_template_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_global_settings_updated_at
BEFORE UPDATE ON global_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ビジネスロジック関数
-- ============================================

-- 有効な来店周期を取得 (優先順位: 個別設定 > スタイル設定 > グローバル設定)
CREATE OR REPLACE FUNCTION get_effective_cycle(
  p_customer_id uuid,
  p_style_id uuid
) RETURNS integer AS $$
DECLARE
  v_individual integer;
  v_style integer;
  v_global integer;
BEGIN
  SELECT individual_cycle_days INTO v_individual
  FROM customer WHERE id = p_customer_id;
  IF v_individual IS NOT NULL THEN RETURN v_individual; END IF;

  SELECT base_cycle_days INTO v_style
  FROM style_settings WHERE id = p_style_id;
  IF v_style IS NOT NULL THEN RETURN v_style; END IF;

  SELECT value::integer INTO v_global
  FROM global_settings WHERE key = 'default_cycle_days';
  RETURN COALESCE(v_global, 28);
END;
$$ LANGUAGE plpgsql;

-- リマインド①対象者を取得
CREATE OR REPLACE FUNCTION get_reminder1_targets()
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  line_user_id text,
  visit_id uuid,
  style_name text,
  cycle_days integer,
  reminder1_days integer,
  visit_date date
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_visits AS (
    SELECT DISTINCT ON (vh.customer_id)
      vh.id AS visit_id,
      vh.customer_id,
      vh.visit_date,
      vh.style_category_id
    FROM visit_history vh
    ORDER BY vh.customer_id, vh.visit_date DESC
  )
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.line_user_id,
    lv.visit_id,
    ss.style_name,
    COALESCE(c.individual_cycle_days, ss.base_cycle_days) AS cycle_days,
    ss.reminder1_days,
    lv.visit_date
  FROM latest_visits lv
  JOIN customer c ON c.id = lv.customer_id
  JOIN style_settings ss ON ss.id = lv.style_category_id
  WHERE c.line_user_id IS NOT NULL
    AND c.line_blocked = false
    AND (lv.visit_date + ss.reminder1_days) <= CURRENT_DATE
    AND (lv.visit_date + ss.reminder1_days) > (CURRENT_DATE - 1)
    AND NOT EXISTS (
      SELECT 1 FROM line_message_history lmh
      WHERE lmh.visit_history_id = lv.visit_id
        AND lmh.message_type = 'reminder1'
        AND lmh.status = 'sent'
    );
END;
$$ LANGUAGE plpgsql;

-- リマインド②対象者を取得
CREATE OR REPLACE FUNCTION get_reminder2_targets()
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  line_user_id text,
  visit_id uuid,
  style_name text,
  cycle_days integer,
  reminder2_days integer,
  visit_date date
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_visits AS (
    SELECT DISTINCT ON (vh.customer_id)
      vh.id AS visit_id,
      vh.customer_id,
      vh.visit_date,
      vh.style_category_id
    FROM visit_history vh
    ORDER BY vh.customer_id, vh.visit_date DESC
  )
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.line_user_id,
    lv.visit_id,
    ss.style_name,
    COALESCE(c.individual_cycle_days, ss.base_cycle_days) AS cycle_days,
    ss.reminder2_days,
    lv.visit_date
  FROM latest_visits lv
  JOIN customer c ON c.id = lv.customer_id
  JOIN style_settings ss ON ss.id = lv.style_category_id
  WHERE c.line_user_id IS NOT NULL
    AND c.line_blocked = false
    AND (lv.visit_date + ss.reminder2_days) <= CURRENT_DATE
    AND (lv.visit_date + ss.reminder2_days) > (CURRENT_DATE - 1)
    AND NOT EXISTS (
      SELECT 1 FROM line_message_history lmh
      WHERE lmh.visit_history_id = lv.visit_id
        AND lmh.message_type = 'reminder2'
        AND lmh.status = 'sent'
    );
END;
$$ LANGUAGE plpgsql;

-- 休眠顧客を取得 (90日以上未来店)
CREATE OR REPLACE FUNCTION get_dormant_customers()
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  line_user_id text,
  last_visit date,
  days_since_visit integer
) AS $$
DECLARE
  v_threshold integer;
BEGIN
  SELECT value::integer INTO v_threshold
  FROM global_settings WHERE key = 'dormant_threshold_days';
  v_threshold := COALESCE(v_threshold, 90);

  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.line_user_id,
    c.last_visit_date AS last_visit,
    (CURRENT_DATE - c.last_visit_date)::integer AS days_since_visit
  FROM customer c
  WHERE c.line_user_id IS NOT NULL
    AND c.line_blocked = false
    AND c.last_visit_date IS NOT NULL
    AND (CURRENT_DATE - c.last_visit_date) >= v_threshold
    AND NOT EXISTS (
      SELECT 1 FROM line_message_history lmh
      WHERE lmh.customer_id = c.id
        AND lmh.message_type = 'dormant'
        AND lmh.sent_at > (now() - INTERVAL '7 days')
    );
END;
$$ LANGUAGE plpgsql;
