-- ============================================
-- 初期データ (シードデータ)
-- ============================================

-- スタイル設定
INSERT INTO style_settings (style_name, base_cycle_days, reminder1_days, reminder2_days, display_order) VALUES
  ('フェード', 21, 18, 35, 1),
  ('メンズショート', 28, 25, 42, 2),
  ('ミディアム', 35, 30, 50, 3),
  ('その他', 30, 25, 45, 4)
ON CONFLICT (style_name) DO NOTHING;

-- グローバル設定
INSERT INTO global_settings (key, value) VALUES
  ('default_cycle_days', '28'),
  ('dormant_threshold_days', '90'),
  ('store_name', 'COOKIE for MEN'),
  ('booking_url', ''),
  ('weekday_availability_text', '平日は比較的空きがございます。お気軽にご予約ください。')
ON CONFLICT (key) DO NOTHING;

-- LINEテンプレート
INSERT INTO line_template_settings (template_type, title, body_text, coupon_text, booking_url) VALUES
  ('thank_you', 'サンキューLINE',
   '{{customer_name}}様、本日はご来店いただきありがとうございました！\n\n今回のスタイル：{{style_name}}\nおすすめの来店周期：約{{cycle_days}}日\n\n次回のご来店時期が近づきましたらLINEでお知らせいたします。',
   NULL, ''),
  ('reminder1', 'リマインドLINE①',
   '{{customer_name}}様\n\n前回のご来店から{{cycle_days}}日が経ちました。\nそろそろカットの時期ですね！\n\nご都合の良い日時にご予約ください。',
   NULL, ''),
  ('reminder2', 'リマインドLINE②',
   '{{customer_name}}様\n\nお久しぶりです！COOKIE for MENです。\n\nスタイルの維持のため、そろそろメンテナンスはいかがでしょうか？\n\n{{coupon_text}}',
   '次回ご来店時に使えるクーポンをプレゼント！', ''),
  ('dormant', '休眠顧客LINE',
   '{{customer_name}}様\n\nお元気ですか？COOKIE for MENです。\n\n{{weekday_text}}\n\nまたのご来店をお待ちしております。',
   NULL, '')
ON CONFLICT (template_type) DO NOTHING;
