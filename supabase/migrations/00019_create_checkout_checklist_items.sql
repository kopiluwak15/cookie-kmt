-- 退勤チェックリスト項目マスター（管理画面で編集可能）
CREATE TABLE IF NOT EXISTS checkout_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- checkout_checklist に完了項目IDを保存するカラム追加
ALTER TABLE checkout_checklist ADD COLUMN IF NOT EXISTS completed_item_ids JSONB DEFAULT '[]'::jsonb;

-- RLS
ALTER TABLE checkout_checklist_items ENABLE ROW LEVEL SECURITY;

-- 管理者は全操作可能
CREATE POLICY "admin_checklist_items_select" ON checkout_checklist_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_checklist_items_insert" ON checkout_checklist_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_checklist_items_update" ON checkout_checklist_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_checklist_items_delete" ON checkout_checklist_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- スタッフは閲覧のみ
CREATE POLICY "staff_checklist_items_select" ON checkout_checklist_items
  FOR SELECT TO authenticated USING (is_active = true);

-- デフォルトのチェックリスト項目を挿入
INSERT INTO checkout_checklist_items (label, description, sort_order) VALUES
  ('店内清掃', '床、机、トイレなど店内全体の清掃を完了', 1),
  ('ドア施錠', '玄関、バックドア、窓など全てのドアを施錠', 2),
  ('在庫確認', '営業用品・消耗品の在庫を確認', 3),
  ('レジ確認', 'レジの金額確認と精算を完了', 4);
