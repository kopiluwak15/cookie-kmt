-- ============================================
-- 00034 薬剤プリセット管理テーブル
-- 施術ログの薬剤チップ選択肢を管理画面から追加・削除可能にする
-- ============================================

CREATE TABLE IF NOT EXISTS chemical_presets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL,          -- ストレート / カラー / パーマ / トリートメント
  name          text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT chemical_presets_unique UNIQUE (category, name)
);

CREATE INDEX IF NOT EXISTS chemical_presets_category_idx
  ON chemical_presets(category, display_order);

-- RLS
ALTER TABLE chemical_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chemical_presets_auth_all ON chemical_presets;
CREATE POLICY chemical_presets_auth_all ON chemical_presets
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 初期データ（既存ハードコード分）
INSERT INTO chemical_presets (category, name, display_order) VALUES
  -- ストレート
  ('ストレート', '酸性ストレート1液', 1),
  ('ストレート', 'アルカリ1液', 2),
  ('ストレート', 'チオ系1液', 3),
  ('ストレート', 'シス系1液', 4),
  ('ストレート', '2液(過酸化水素)', 5),
  ('ストレート', '2液(臭素酸)', 6),
  ('ストレート', 'GMT', 7),
  ('ストレート', 'スピエラ', 8),
  -- カラー
  ('カラー', 'アルカリカラー', 1),
  ('カラー', 'ノンジアミン', 2),
  ('カラー', 'ヘアマニキュア', 3),
  ('カラー', 'ブリーチ', 4),
  ('カラー', 'オキシ3%', 5),
  ('カラー', 'オキシ6%', 6),
  ('カラー', 'オキシ9%', 7),
  -- パーマ
  ('パーマ', 'コスメパーマ液', 1),
  ('パーマ', 'チオ系パーマ', 2),
  ('パーマ', 'シス系パーマ', 3),
  ('パーマ', 'デジタルパーマ', 4),
  -- トリートメント
  ('トリートメント', '酸熱トリートメント', 1),
  ('トリートメント', '水素トリートメント', 2),
  ('トリートメント', 'ケラチン補修', 3),
  ('トリートメント', '酵素クレンジング', 4),
  ('トリートメント', 'TOKIOインカラミ', 5),
  ('トリートメント', 'オージュア', 6)
ON CONFLICT (category, name) DO NOTHING;
