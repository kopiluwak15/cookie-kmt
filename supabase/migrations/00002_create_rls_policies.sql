-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_template_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;

-- スタッフ: 認証済みユーザーは全員読み取り可能
CREATE POLICY "authenticated_read_staff" ON staff
  FOR SELECT USING (auth.role() = 'authenticated');

-- 顧客: 認証済みユーザーは全操作可能
CREATE POLICY "authenticated_all_customer" ON customer
  FOR ALL USING (auth.role() = 'authenticated');

-- スタイル設定: 認証済みユーザーは読み取り可能、管理者は全操作
CREATE POLICY "authenticated_read_styles" ON style_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_styles" ON style_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid() AND staff.role = 'admin'
    )
  );

-- 施術履歴: 認証済みユーザーは全操作可能
CREATE POLICY "authenticated_all_visits" ON visit_history
  FOR ALL USING (auth.role() = 'authenticated');

-- LINE送信履歴: 認証済みユーザーは読み取り、サーバーのみ書き込み
CREATE POLICY "authenticated_read_line_history" ON line_message_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- LINEテンプレート: 認証済み読み取り、管理者全操作
CREATE POLICY "authenticated_read_templates" ON line_template_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_templates" ON line_template_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid() AND staff.role = 'admin'
    )
  );

-- グローバル設定: 認証済み読み取り、管理者全操作
CREATE POLICY "authenticated_read_global" ON global_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_global" ON global_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid() AND staff.role = 'admin'
    )
  );

-- 予約履歴: 認証済みユーザーは全操作可能
CREATE POLICY "authenticated_all_reservations" ON reservation_history
  FOR ALL USING (auth.role() = 'authenticated');
