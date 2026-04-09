-- チェックリスト担当スタッフをglobal_settingsで一括管理
-- キー: checklist_assigned_staff_id

-- checkout_checklist テーブルの旧カラムをNULL許可に変更（互換性維持）
ALTER TABLE checkout_checklist
  ALTER COLUMN cleaned DROP NOT NULL,
  ALTER COLUMN doors_locked DROP NOT NULL,
  ALTER COLUMN inventory_checked DROP NOT NULL,
  ALTER COLUMN register_checked DROP NOT NULL;

-- completed_item_ids カラム追加（まだの場合）
ALTER TABLE checkout_checklist ADD COLUMN IF NOT EXISTS completed_item_ids JSONB DEFAULT '[]'::jsonb;
