-- サービスメニューテーブル
CREATE TABLE service_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  estimated_minutes integer NOT NULL DEFAULT 30,
  default_price integer,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_menus ENABLE ROW LEVEL SECURITY;

-- 初期データ
INSERT INTO service_menus (name, estimated_minutes, display_order) VALUES
  ('カット', 30, 1),
  ('ブラックカラー', 30, 2),
  ('髭脱毛', 15, 3),
  ('眉カット', 5, 4),
  ('ヘッドスパ', 10, 5);
