-- ============================================
-- 00032 コンセプト用サンキュー & メンテナンスLINE 拡張
--   thank_you_concept : コンセプトメニュー専用サンキュー
--   maintenance_1     : 施術N日後の1回目メンテナンスチケット
--   maintenance_2     : 施術N日後の2回目メンテナンスチケット
-- ============================================

-- 1. CHECK 制約の張り直し（既存値はそのまま温存）
ALTER TABLE line_template_settings
  DROP CONSTRAINT IF EXISTS line_template_settings_template_type_check;
ALTER TABLE line_template_settings
  ADD CONSTRAINT line_template_settings_template_type_check
  CHECK (template_type IN (
    'thank_you',
    'thank_you_concept',
    'reminder1',
    'reminder2',
    'dormant',
    'maintenance_1',
    'maintenance_2'
  ));

ALTER TABLE line_message_history
  DROP CONSTRAINT IF EXISTS line_message_history_message_type_check;
ALTER TABLE line_message_history
  ADD CONSTRAINT line_message_history_message_type_check
  CHECK (message_type IN (
    'thank_you',
    'thank_you_concept',
    'reminder1',
    'reminder2',
    'dormant',
    'custom',
    'maintenance_1',
    'maintenance_2'
  ));

-- 2. デフォルトテンプレート投入
INSERT INTO line_template_settings (template_type, title, body_text, coupon_text, booking_url, is_active)
VALUES
  ('thank_you_concept', 'コンセプト用サンキューLINE',
   E'{{customer_name}}様\n\n本日はコンセプトメニューをご体験いただき、ありがとうございました！\nお悩みに合わせてご提案した{{style_name}}、いかがでしたでしょうか。\n\n施術後1ヶ月・2ヶ月のタイミングで、状態を維持するためのメンテナンスチケットを順番にお送りします。\nぜひ次回もご活用ください。\n\nCOOKIE 熊本',
   NULL, NULL, true),
  ('maintenance_1', 'メンテナンスLINE①（1ヶ月後）',
   E'{{customer_name}}様\n\nコンセプトメニュー後の状態はいかがですか？\n施術から約1ヶ月、そろそろ最初のメンテナンスのタイミングです。\n\n🎟 メンテナンスチケット①\n有効期限: {{ticket_valid_until}}\n\nご予約はこちらから↓\n{{booking_url}}\n\nCOOKIE 熊本',
   NULL, NULL, true),
  ('maintenance_2', 'メンテナンスLINE②（2ヶ月後）',
   E'{{customer_name}}様\n\n施術から約2ヶ月が経ちました。\n2回目のメンテナンスチケットをお送りします。\n\n🎟 メンテナンスチケット②\n有効期限: {{ticket_valid_until}}\n\nご予約はこちらから↓\n{{booking_url}}\n\nCOOKIE 熊本',
   NULL, NULL, true)
ON CONFLICT (template_type) DO NOTHING;

-- 3. メンテナンス送信タイミング（global_settings）デフォルト
INSERT INTO global_settings (key, value)
VALUES
  ('maintenance_1_days_after', '30'),
  ('maintenance_1_validity_days', '14'),
  ('maintenance_2_days_after', '60'),
  ('maintenance_2_validity_days', '14')
ON CONFLICT (key) DO NOTHING;
