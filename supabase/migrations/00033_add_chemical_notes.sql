-- ============================================
-- 00033 薬剤記録を visit_history に追加
-- レギュラー・コンセプト両方で記録可能
-- チップ選択結果＋自由記述を1テキストに格納
-- ============================================

ALTER TABLE visit_history
  ADD COLUMN IF NOT EXISTS chemical_notes text;
