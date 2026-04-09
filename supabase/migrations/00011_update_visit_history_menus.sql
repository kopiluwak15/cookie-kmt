-- style_category_id を NULLABLE に変更（スタイル未選択のケースに対応）
ALTER TABLE visit_history ALTER COLUMN style_category_id DROP NOT NULL;

-- 合計推定時間カラムを追加（選択したメニューの合計推定時間を保存）
ALTER TABLE visit_history ADD COLUMN expected_duration_minutes integer;
