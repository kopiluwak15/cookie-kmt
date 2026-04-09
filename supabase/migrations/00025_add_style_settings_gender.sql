-- Add gender column to style_settings for gender-first selection in visit-log
ALTER TABLE style_settings
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IN ('male', 'female', 'unisex'));

-- Existing styles are all male-oriented (COOKIE 熊本 was originally メンズ中心)
UPDATE style_settings SET gender = 'male'
  WHERE gender IS NULL
    AND style_name IN ('ツーブロック','震災刈り','マッシュ','ウルフ','フェード');

-- ショート/ミディアムは男女兼用扱い
UPDATE style_settings SET gender = 'unisex'
  WHERE gender IS NULL
    AND style_name IN ('ショート','ミディアム');

-- 残りがあれば male 扱い
UPDATE style_settings SET gender = 'male' WHERE gender IS NULL;

-- 女性スタイルを追加（既存と重複しないもののみ）
INSERT INTO style_settings (style_name, base_cycle_days, reminder1_days, reminder2_days, display_order, is_active, gender)
VALUES
  ('ボブ',              45, 40, 60, 10, true, 'female'),
  ('ショートボブ',      40, 35, 55, 11, true, 'female'),
  ('ミディアムレイヤー',60, 55, 75, 12, true, 'female'),
  ('ロング',            75, 70, 90, 13, true, 'female'),
  ('ロングレイヤー',    75, 70, 90, 14, true, 'female'),
  ('髪質改善ストレート',90, 80, 100,15, true, 'female')
ON CONFLICT (style_name) DO NOTHING;
