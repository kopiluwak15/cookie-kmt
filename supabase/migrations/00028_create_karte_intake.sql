-- ============================================
-- 00028 karte_intake / concept_intake
-- LIFFカルテ作成フォーム（9ステップ）の回答を保存
-- コンセプトメニュー時の詳細アンケート（7ステップ）も保存
-- ============================================

-- customer に追加カラム
ALTER TABLE customer
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('female','male','other')),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS occupation text;

-- カルテ初回入力（基本情報以外の質問票）
CREATE TABLE IF NOT EXISTS karte_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  visit_route text,
  todays_wish text[] DEFAULT '{}',
  history text[] DEFAULT '{}',
  worries text[] DEFAULT '{}',
  worries_other text,
  reasons text[] DEFAULT '{}',
  reasons_other text,
  stay_style text,
  stay_style_other text,
  dislikes text[] DEFAULT '{}',
  dislikes_other text,
  spots text[] DEFAULT '{}',
  selected_menus uuid[] DEFAULT '{}',
  is_concept_session boolean NOT NULL DEFAULT false,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_karte_intake_customer ON karte_intake(customer_id);

ALTER TABLE karte_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_all_karte_intake ON karte_intake;
CREATE POLICY authenticated_all_karte_intake ON karte_intake
  USING (auth.role() = 'authenticated');

-- コンセプトメニュー詳細アンケート
CREATE TABLE IF NOT EXISTS concept_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  symptoms text[] DEFAULT '{}',
  symptoms_other text,
  life_impacts text[] DEFAULT '{}',
  life_other text,
  psychology text[] DEFAULT '{}',
  past_experiences text[] DEFAULT '{}',
  success_criteria text[] DEFAULT '{}',
  success_free text,
  priorities text[] DEFAULT '{}',
  worries_free text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_intake_customer ON concept_intake(customer_id);

ALTER TABLE concept_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_all_concept_intake ON concept_intake;
CREATE POLICY authenticated_all_concept_intake ON concept_intake
  USING (auth.role() = 'authenticated');
