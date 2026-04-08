-- =====================================================================
-- cookie-kmt: 初期シードデータ
-- - COOKIE 熊本 店舗
-- - メニューマスター 36件（lib/menus.ts と完全一致）
-- - チケットテンプレート 4件（lib/tickets-mock.ts と完全一致）
-- =====================================================================

-- =============================================
-- 店舗
-- =============================================
insert into public.stores (code, name, name_kana, postal_code, address, phone, email, business_hours, holidays, parking_info)
values (
  'kmt',
  'COOKIE 熊本',
  'クッキー クマモト',
  '860-0000',
  '熊本県熊本市中央区○○町1-2-3 COOKIEビル 2F',
  '096-000-0000',
  'info@cookie.hair',
  '10:00 - 20:00',
  '毎週火曜日',
  '提携駐車場あり（3時間無料）'
)
on conflict (code) do nothing;

-- =============================================
-- メニュー（lib/menus.ts と同じ id）
-- =============================================
do $$
declare
  v_store_id uuid;
begin
  select id into v_store_id from public.stores where code = 'kmt';

  insert into public.menus (id, store_id, name, category, price, is_concept, sort_order) values
  -- カット
  ( 1, v_store_id, 'カット(一般)',         'cut',       4500, false,  1),
  ( 2, v_store_id, 'MEN''s CUT',           'cut',       4000, false,  2),
  ( 3, v_store_id, 'カット(大学生)',       'cut',       3500, false,  3),
  ( 4, v_store_id, 'カット(Under-18)',     'cut',       3500, false,  4),
  ( 5, v_store_id, 'カット(Under-12)',     'cut',       2500, false,  5),
  -- カラー
  (10, v_store_id, 'ジュエルカラー',       'color',     5500, false, 10),
  (11, v_store_id, 'men''sカラー',         'color',     5500, false, 11),
  (12, v_store_id, 'モイスチャーカラー',   'color',    13500, true,  12),
  (13, v_store_id, 'ブラックカラー',       'color',     3000, false, 13),
  (14, v_store_id, 'ブリーチ',             'color',     4500, false, 14),
  (15, v_store_id, 'ヘアマニキュア',       'color',     5500, false, 15),
  -- パーマ
  (20, v_store_id, 'ラグジュアリーパーマ', 'perm',      5500, false, 20),
  (21, v_store_id, 'men''sパーマ',         'perm',      5500, false, 21),
  (22, v_store_id, '酵素クレンジングパーマ','perm',     6500, false, 22),
  -- 矯正・ストレート
  (30, v_store_id, 'ストレート',           'straight',  6000, true,  30),
  (31, v_store_id, '縮毛矯正',             'straight',  8000, true,  31),
  (32, v_store_id, 'men''s縮毛矯正',       'straight',  8000, true,  32),
  (33, v_store_id, '前髪ストレート',       'straight',  3000, true,  33),
  (34, v_store_id, '部分ストレート',       'straight',  4000, true,  34),
  (35, v_store_id, 'モイスチャーストレート','straight',18000, true,  35),
  -- トリートメント
  (40, v_store_id, 'ジュエルトリートメント 2Step', 'treatment', 1500, false, 40),
  (41, v_store_id, 'アローブトリートメント 4Step', 'treatment', 4000, true,  41),
  (42, v_store_id, 'モイスチャートリートメント',    'treatment', 8000, true,  42),
  -- ヘッドスパ
  (50, v_store_id, 'クイックスパ',          'spa', 1000, false, 50),
  (51, v_store_id, '極上30分ヘッドスパ',    'spa', 3000, false, 51),
  (52, v_store_id, 'アローブ30分スパ',      'spa', 4000, true,  52),
  (53, v_store_id, '超極上50分ヘッドスパ',  'spa', 5000, false, 53),
  (54, v_store_id, 'アローブ50分スパ',      'spa', 6000, true,  54),
  -- セット
  (60, v_store_id, 'ヘアセット',            'set', 4000, false, 60),
  (61, v_store_id, 'メンズヘアセット',      'set', 2000, false, 61),
  (62, v_store_id, 'メイクA',               'set', 2000, false, 62),
  -- オプション
  (70, v_store_id, '前髪カット',            'option', 1000, false, 70),
  (71, v_store_id, 'ショート料金',          'option',  500, false, 71),
  (72, v_store_id, 'ミディアム料金',        'option', 1000, false, 72),
  (73, v_store_id, 'ロング料金',            'option', 1500, false, 73),
  (74, v_store_id, 'シャンプー',            'option', 1000, false, 74)
  on conflict (id) do nothing;

  -- =============================================
  -- チケットテンプレート
  -- =============================================
  insert into public.ticket_templates (store_id, type, title, description, discount_rate, discount_amount, valid_months) values
  (v_store_id, 'maintenance_50',   '髪質改善メンテナンス 50%OFF', '次回のメンテナンス施術が半額になります', 50,   null, 2),
  (v_store_id, 'treatment_free',   'プレミアムトリートメント無料', '次回ご来店時、トリートメントを無料でお付けします', null, 5500, 3),
  (v_store_id, 'ct_2000off',       'C&T施術 ¥2,000 OFF',          'カット＋トリートメント施術が2,000円引き', null, 2000, 2),
  (v_store_id, 'first_intro_1000', 'ご紹介ありがとうクーポン ¥1,000 OFF', '次回のお会計から1,000円引き', null, 1000, 6)
  on conflict (store_id, type) do nothing;
end $$;
