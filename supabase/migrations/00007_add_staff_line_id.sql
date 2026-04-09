-- スタッフテーブルにLINEユーザーIDを追加（LINEログイン用）
ALTER TABLE staff ADD COLUMN line_user_id text UNIQUE;
