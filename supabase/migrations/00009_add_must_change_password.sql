-- スタッフの初回パスワード変更フラグ
ALTER TABLE staff ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT true;

-- 既存スタッフは変更済みとする
UPDATE staff SET must_change_password = false;
