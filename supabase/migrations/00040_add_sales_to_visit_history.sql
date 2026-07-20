-- 00040: visit_history に売上金額を追加
-- 目的:
--  来店履歴に金額（sell_price / tax / discount）を記録
--  後付け登録時に施術ログとして売上管理を可能にする

ALTER TABLE visit_history ADD COLUMN IF NOT EXISTS sell_price integer DEFAULT 0;
ALTER TABLE visit_history ADD COLUMN IF NOT EXISTS tax_rate_type text DEFAULT 'included' CHECK (tax_rate_type IN ('included', 'excluded'));
ALTER TABLE visit_history ADD COLUMN IF NOT EXISTS tax_amount integer DEFAULT 0;
ALTER TABLE visit_history ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percent'));
ALTER TABLE visit_history ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;
ALTER TABLE visit_history ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN visit_history.sell_price IS '施術売価（税込み表示基準）';
COMMENT ON COLUMN visit_history.tax_rate_type IS '税計算方式: included(税込)/ excluded(税抜) → 表示は常に税込';
COMMENT ON COLUMN visit_history.tax_amount IS '計算済み税額（数値）';
COMMENT ON COLUMN visit_history.discount_type IS 'fixed(固定額) / percent(パーセント)';
COMMENT ON COLUMN visit_history.discount_amount IS '割引額またはパーセント（-1000 または -20）';
COMMENT ON COLUMN visit_history.display_name IS '請求表示用（「カット + カラー」等）';

CREATE INDEX IF NOT EXISTS idx_visit_history_sell_price ON visit_history(sell_price) WHERE sell_price > 0;
