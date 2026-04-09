-- service_menus にコンセプトメニュー判定列を追加
ALTER TABLE service_menus
  ADD COLUMN IF NOT EXISTS is_concept boolean NOT NULL DEFAULT false;
