-- ============================================
-- 00030 karte_intake.selected_menus を text[] に変更
-- ============================================
-- カルテ作成時のメニュー選択は、具体的なメニューID (uuid) ではなく
-- カテゴリーキー ('kaizen', 'regular', 'consult', 'care', 'product') を保存する。
-- 具体メニューはスタッフが施術ログ時に入力する設計に変更したため。

ALTER TABLE karte_intake
  ALTER COLUMN selected_menus DROP DEFAULT;

ALTER TABLE karte_intake
  ALTER COLUMN selected_menus TYPE text[] USING selected_menus::text[];

ALTER TABLE karte_intake
  ALTER COLUMN selected_menus SET DEFAULT '{}';
