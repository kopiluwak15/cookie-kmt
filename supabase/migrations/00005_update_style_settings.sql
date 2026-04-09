-- ============================================
-- 施術メニュー（スタイル設定）を更新
-- ツーブロック・震災刈り・マッシュ・ウルフ・ショート・ミディアム・フェード
-- ============================================

-- 既存のスタイル設定を無効化
UPDATE style_settings SET is_active = false;

-- 新しいメニューを追加（全て30日周期で仮置き、管理画面から変更可能）
INSERT INTO style_settings (style_name, base_cycle_days, reminder1_days, reminder2_days, display_order, is_active)
VALUES
  ('ツーブロック', 30, 25, 40, 1, true),
  ('震災刈り', 30, 25, 40, 2, true),
  ('マッシュ', 30, 25, 40, 3, true),
  ('ウルフ', 30, 25, 40, 4, true),
  ('ショート', 30, 25, 40, 5, true),
  ('ミディアム', 30, 25, 40, 6, true),
  ('フェード', 30, 25, 40, 7, true)
ON CONFLICT (style_name) DO UPDATE SET
  base_cycle_days = EXCLUDED.base_cycle_days,
  reminder1_days = EXCLUDED.reminder1_days,
  reminder2_days = EXCLUDED.reminder2_days,
  display_order = EXCLUDED.display_order,
  is_active = true;
