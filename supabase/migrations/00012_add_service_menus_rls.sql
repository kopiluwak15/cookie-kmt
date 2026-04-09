-- service_menus テーブルのRLSポリシー追加
-- （RLSは有効だがポリシーが未定義だったため、認証ユーザーがデータを読めなかった）

-- 認証済みユーザーは読み取り可能
CREATE POLICY "authenticated_read_service_menus" ON service_menus
  FOR SELECT USING (auth.role() = 'authenticated');

-- 管理者は全操作可能
CREATE POLICY "admin_manage_service_menus" ON service_menus
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid() AND staff.role = 'admin'
    )
  );
