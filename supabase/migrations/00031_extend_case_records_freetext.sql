-- ============================================
-- 00031 case_records 自由記述拡張
-- 要件: コンセプトメニュー時の症例ログを情報量増やす
--   counseling_notes : カウンセリングで出てきた話
--   treatment_findings: 施術での発見
--   next_proposal    : 次回への提案・申し送り
-- ============================================

ALTER TABLE case_records
  ADD COLUMN IF NOT EXISTS counseling_notes  text,
  ADD COLUMN IF NOT EXISTS treatment_findings text,
  ADD COLUMN IF NOT EXISTS next_proposal     text;
