-- オーナー権限カラム追加
-- cookie-crm 本番では手動で追加されていたため、公式 migration 化
-- 削除・編集など破壊的操作の権限フラグ
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN staff.is_owner IS 'オーナー権限（顧客削除・施術ログ編集など破壊的操作の権限）';
