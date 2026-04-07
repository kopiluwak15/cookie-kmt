-- ========================================
-- cookie-kmt LINE CRM System
-- Initial Database Schema
-- ========================================

-- 店舗マスタ
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  business_hours JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- スタッフ
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('junior', 'stylist', 'top')) DEFAULT 'stylist',
  role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'owner')) DEFAULT 'staff',
  line_user_id TEXT,
  line_linked_at TIMESTAMP WITH TIME ZONE,
  license_url TEXT,
  license_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 顧客
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  line_user_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  birthday DATE,
  address TEXT,
  visit_count INTEGER DEFAULT 0,
  last_visit_date DATE,
  last_checkin_date DATE,
  preferred_staff_id UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- メニュー
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  menu_type TEXT NOT NULL CHECK (menu_type IN ('regular', 'concept')) DEFAULT 'regular',
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- スタイル（リマインド周期管理）
CREATE TABLE styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  reminder_days INTEGER NOT NULL DEFAULT 42,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 来店記録
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  menu_id UUID NOT NULL REFERENCES menus(id),
  style_id UUID REFERENCES styles(id),
  visit_date DATE NOT NULL,
  visit_time TIME,
  amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (amount - discount_amount) STORED,
  is_concept BOOLEAN NOT NULL DEFAULT FALSE,
  log_text TEXT,
  log_voice_url TEXT,
  log_status TEXT CHECK (log_status IN ('draft', 'submitted', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 悩みアンケート（コンセプトメニュー専用）
CREATE TABLE concept_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  symptoms TEXT[] DEFAULT '{}',
  symptoms_other TEXT,
  life_impacts TEXT[] DEFAULT '{}',
  life_impacts_other TEXT,
  psychology TEXT[] DEFAULT '{}',
  past_experience TEXT[] DEFAULT '{}',
  success_criteria TEXT[] DEFAULT '{}',
  success_free_text TEXT,
  priorities TEXT[] DEFAULT '{}',
  worries TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 施術詳細ログ（コンセプトメニュー専用）
CREATE TABLE concept_treatment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  treatment_method TEXT NOT NULL,
  treatment_details JSONB DEFAULT '{}',
  chemicals_used TEXT[],
  processing_time INTEGER,
  result_text TEXT,
  client_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- チケット（メンテナンスチケット）
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  menu_id UUID NOT NULL REFERENCES menus(id),
  ticket_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'delivered', 'used', 'expired')) DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_staff_id UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インセンティブ設定
CREATE TABLE incentive_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  calc_type TEXT NOT NULL CHECK (calc_type IN ('simple', 'repeat', 'stage', 'hybrid')) DEFAULT 'simple',
  base_amount DECIMAL(10, 2),
  base_rate DECIMAL(5, 2) DEFAULT 5.00,
  repeat_bonus DECIMAL(10, 2) DEFAULT 0,
  repeat_same_staff BOOLEAN DEFAULT TRUE,
  stage_multipliers JSONB DEFAULT '{"junior": 1.0, "stylist": 1.2, "top": 1.5}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id)
);

-- インセンティブ履歴
CREATE TABLE incentive_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  visit_id UUID REFERENCES visits(id),
  customer_id UUID REFERENCES customers(id),
  record_type TEXT NOT NULL CHECK (record_type IN ('base', 'repeat_bonus')) DEFAULT 'base',
  amount DECIMAL(10, 2) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- リマインド
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  visit_id UUID NOT NULL REFERENCES visits(id),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'line', 'sms')) DEFAULT 'line',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LINE メッセージログ
CREATE TABLE line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  line_user_id TEXT,
  message_type TEXT NOT NULL,
  message_content JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- キャンペーン
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  title TEXT NOT NULL,
  description TEXT,
  html_content TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- アンケートテンプレート（シンプルアンケート用）
CREATE TABLE questionnaire_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  template_type TEXT NOT NULL CHECK (template_type IN ('simple', 'carte', 'concept')),
  questions JSONB NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, template_type, is_active)
);

-- 店舗設定
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, key)
);

-- ========================================
-- インデックス
-- ========================================

CREATE INDEX idx_staff_store_id ON staff(store_id);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_line_user_id ON staff(line_user_id);

CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_customers_line_user_id ON customers(line_user_id);

CREATE INDEX idx_menus_store_id ON menus(store_id);
CREATE INDEX idx_menus_type ON menus(menu_type);

CREATE INDEX idx_visits_store_id ON visits(store_id);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_staff_id ON visits(staff_id);
CREATE INDEX idx_visits_visit_date ON visits(visit_date);
CREATE INDEX idx_visits_is_concept ON visits(is_concept);

CREATE INDEX idx_concept_questionnaires_visit_id ON concept_questionnaires(visit_id);
CREATE INDEX idx_concept_questionnaires_customer_id ON concept_questionnaires(customer_id);

CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE INDEX idx_incentive_records_staff_id ON incentive_records(staff_id);
CREATE INDEX idx_incentive_records_visit_id ON incentive_records(visit_id);

CREATE INDEX idx_reminders_customer_id ON reminders(customer_id);
CREATE INDEX idx_reminders_scheduled_at ON reminders(scheduled_at);

CREATE INDEX idx_line_messages_customer_id ON line_messages(customer_id);

-- ========================================
-- トリガー: visits.is_concept を menus.menu_type から自動設定
-- ========================================

CREATE OR REPLACE FUNCTION set_visits_is_concept()
RETURNS TRIGGER AS $$
BEGIN
  SELECT (menu_type = 'concept') INTO NEW.is_concept
  FROM menus WHERE id = NEW.menu_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visits_set_is_concept
BEFORE INSERT OR UPDATE OF menu_id ON visits
FOR EACH ROW EXECUTE FUNCTION set_visits_is_concept();

-- ========================================
-- RLS (Row Level Security) は別途設定予定
-- ========================================
