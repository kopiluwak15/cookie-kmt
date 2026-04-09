-- service_menus にカテゴリ列を追加
ALTER TABLE service_menus
  ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS service_menus_category_idx ON service_menus(category);
