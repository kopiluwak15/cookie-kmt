-- 店舗テーブル（将来の複数店舗展開に対応）
CREATE TABLE store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  store_code text UNIQUE NOT NULL,
  address text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS 有効化
ALTER TABLE store ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーは読み取り可
CREATE POLICY "authenticated_read_store" ON store
  FOR SELECT USING (auth.role() = 'authenticated');

-- admin のみ店舗の作成・更新・削除が可能
CREATE POLICY "admin_manage_store" ON store
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid() AND staff.role = 'admin'
    )
  );

-- staff テーブルに store_id を追加（nullable = 既存データ互換）
ALTER TABLE staff ADD COLUMN store_id uuid REFERENCES store(id) ON DELETE SET NULL;

CREATE INDEX idx_staff_store ON staff(store_id);
