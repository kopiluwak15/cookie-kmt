-- RLS ポリシーの修正
-- INSERT/UPDATE操作にWITH CHECKを追加

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "admin_all_announcements" ON announcements;
DROP POLICY IF EXISTS "admin_all_recipients" ON announcement_recipients;
DROP POLICY IF EXISTS "admin_all_reads" ON announcement_reads;
DROP POLICY IF EXISTS "admin_all_attendance" ON attendance;
DROP POLICY IF EXISTS "admin_all_checklist" ON checkout_checklist;
DROP POLICY IF EXISTS "staff_own_attendance" ON attendance;
DROP POLICY IF EXISTS "staff_own_checklist" ON checkout_checklist;
DROP POLICY IF EXISTS "staff_own_reads" ON announcement_reads;
DROP POLICY IF EXISTS "staff_insert_reads" ON announcement_reads;
DROP POLICY IF EXISTS "staff_view_announcements" ON announcement_recipients;

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
