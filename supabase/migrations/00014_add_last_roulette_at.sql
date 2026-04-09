-- ルーレット1日1回制限用カラム追加
ALTER TABLE customer ADD COLUMN IF NOT EXISTS last_roulette_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN customer.last_roulette_at IS '最後にルーレットを実行した日時（1日1回制限用）';
