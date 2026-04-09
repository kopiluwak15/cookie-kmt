-- ============================================
-- 00026 case_records
-- 「悩み → 施術 → リピート」症例蓄積テーブル
--   1 visit_history = 1 case_record （1:1、任意）
--   concern_tags / treatment_tags を配列で持ち、
--   Claude/OpenAI で要約した ai_summary を格納する
-- ============================================

CREATE TABLE IF NOT EXISTS case_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_history_id uuid NOT NULL REFERENCES visit_history(id) ON DELETE CASCADE,
  customer_id      uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,

  -- 悩み（チップ配列 + 自由記述）
  concern_tags   text[] NOT NULL DEFAULT '{}',
  concern_raw    text,

  -- 施術要点（チップ配列 + 自由記述）
  treatment_tags text[] NOT NULL DEFAULT '{}',
  treatment_raw  text,

  -- スタッフ自己評価（任意、1-5）
  satisfaction_self int CHECK (satisfaction_self BETWEEN 1 AND 5),

  -- AI 要約（保存直後は NULL、バックグラウンド生成）
  ai_summary        text,
  ai_model          text,
  ai_summarized_at  timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT case_records_visit_unique UNIQUE (visit_history_id)
);

CREATE INDEX IF NOT EXISTS case_records_customer_idx
  ON case_records(customer_id);
CREATE INDEX IF NOT EXISTS case_records_concern_tags_gin
  ON case_records USING gin(concern_tags);
CREATE INDEX IF NOT EXISTS case_records_treatment_tags_gin
  ON case_records USING gin(treatment_tags);
CREATE INDEX IF NOT EXISTS case_records_created_at_idx
  ON case_records(created_at DESC);

-- 更新時タイムスタンプ
CREATE OR REPLACE FUNCTION update_case_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS case_records_updated_at ON case_records;
CREATE TRIGGER case_records_updated_at
  BEFORE UPDATE ON case_records
  FOR EACH ROW
  EXECUTE FUNCTION update_case_records_updated_at();

-- RLS: 認証ユーザーが自分の店舗のデータを読み書きできる
ALTER TABLE case_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_records_auth_all ON case_records;
CREATE POLICY case_records_auth_all ON case_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
