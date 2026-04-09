-- 労務管理システムのテーブル作成

-- 1. お知らせテンプレート
CREATE TABLE IF NOT EXISTS announcement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. お知らせ（重要度：重要/確認/指示/お知らせ/その他）
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  importance VARCHAR(20) NOT NULL CHECK (importance IN ('重要', '確認', '指示', 'お知らせ', 'その他')),
  is_logged BOOLEAN DEFAULT true, -- ログ記録するかどうか
  template_id UUID REFERENCES announcement_templates(id),
  created_by UUID NOT NULL, -- スタッフID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 3. お知らせ配信対象
CREATE TABLE IF NOT EXISTS announcement_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. お知らせ確認ログ
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, staff_id) -- 同じお知らせの複数確認を防止
);

-- 5. 出勤・退勤管理
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  date DATE NOT NULL,
  checkin_time TIMESTAMP WITH TIME ZONE,
  checkout_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, date) -- 1スタッフ1日1レコード
);

-- 6. 退勤チェックリスト
CREATE TABLE IF NOT EXISTS checkout_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  date DATE NOT NULL,
  cleaned BOOLEAN DEFAULT false,
  doors_locked BOOLEAN DEFAULT false,
  inventory_checked BOOLEAN DEFAULT false,
  register_checked BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- 7. スタッフ属性・給与情報
CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('正社員 S1', '正社員 S2', '正社員 S3', '正社員 S4', '正社員 S5', '正社員 S6', '業務委託 A', '業務委託 B')),
  hourly_rate DECIMAL(10, 2), -- 時給（業務委託用）
  base_salary DECIMAL(10, 2), -- 基本給（正社員用）
  commission_rate DECIMAL(5, 2), -- 歩合率（%）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_announcements_importance ON announcements(importance);
CREATE INDEX IF NOT EXISTS idx_announcements_is_logged ON announcements(is_logged);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_staff_id ON announcement_recipients(staff_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_staff_id ON announcement_reads(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id_date ON attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_checkout_checklist_staff_id_date ON checkout_checklist(staff_id, date);

-- RLS（Row Level Security）ポリシー設定
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_checklist ENABLE ROW LEVEL SECURITY;

-- ===== announcements テーブルポリシー =====
-- 管理者はすべての操作可能
CREATE POLICY "admin_announcements_select" ON announcements
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_announcements_insert" ON announcements
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_announcements_update" ON announcements
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_announcements_delete" ON announcements
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- ===== announcement_recipients テーブルポリシー =====
CREATE POLICY "admin_recipients_select" ON announcement_recipients
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_recipients_insert" ON announcement_recipients
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_recipients_update" ON announcement_recipients
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_recipients_delete" ON announcement_recipients
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "staff_view_recipients" ON announcement_recipients
  FOR SELECT TO authenticated USING (staff_id = auth.uid());

-- ===== announcement_reads テーブルポリシー =====
CREATE POLICY "admin_reads_select" ON announcement_reads
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_reads_insert" ON announcement_reads
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_reads_update" ON announcement_reads
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_reads_delete" ON announcement_reads
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "staff_own_reads" ON announcement_reads
  FOR SELECT TO authenticated USING (staff_id = auth.uid());

CREATE POLICY "staff_insert_reads" ON announcement_reads
  FOR INSERT TO authenticated WITH CHECK (staff_id = auth.uid());

-- ===== attendance テーブルポリシー =====
-- 管理者はすべての操作可能
CREATE POLICY "admin_attendance_select" ON attendance
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_attendance_insert" ON attendance
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_attendance_update" ON attendance
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_attendance_delete" ON attendance
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- スタッフは自分の出勤・退勤記録のみ操作可能
CREATE POLICY "staff_attendance_select" ON attendance
  FOR SELECT TO authenticated USING (staff_id = auth.uid());

CREATE POLICY "staff_attendance_insert" ON attendance
  FOR INSERT TO authenticated WITH CHECK (staff_id = auth.uid());

CREATE POLICY "staff_attendance_update" ON attendance
  FOR UPDATE TO authenticated
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "staff_attendance_delete" ON attendance
  FOR DELETE TO authenticated USING (staff_id = auth.uid());

-- ===== checkout_checklist テーブルポリシー =====
-- 管理者はすべての操作可能
CREATE POLICY "admin_checklist_select" ON checkout_checklist
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_checklist_insert" ON checkout_checklist
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_checklist_update" ON checkout_checklist
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_checklist_delete" ON checkout_checklist
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- スタッフは自分のチェックリストのみ操作可能
CREATE POLICY "staff_checklist_select" ON checkout_checklist
  FOR SELECT TO authenticated USING (staff_id = auth.uid());

CREATE POLICY "staff_checklist_insert" ON checkout_checklist
  FOR INSERT TO authenticated WITH CHECK (staff_id = auth.uid());

CREATE POLICY "staff_checklist_update" ON checkout_checklist
  FOR UPDATE TO authenticated
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "staff_checklist_delete" ON checkout_checklist
  FOR DELETE TO authenticated USING (staff_id = auth.uid());
