-- ============================================
-- アンケート機能追加
-- ============================================

-- 顧客テーブルに来店動機カラムを追加
ALTER TABLE customer ADD COLUMN IF NOT EXISTS visit_motivation text;

-- visit_motivation へのコメント
COMMENT ON COLUMN customer.visit_motivation IS '来店動機（Instagram, Google検索, ホットペッパー等）';

-- ルーレット当選確率のデフォルト設定（1%）
INSERT INTO global_settings (key, value)
VALUES ('roulette_win_rate', '1')
ON CONFLICT (key) DO NOTHING;
