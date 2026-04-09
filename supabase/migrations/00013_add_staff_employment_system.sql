-- 雇用形態・ステージシステム
-- 正社員(6段階)・アルバイトパート(時給)・業務委託(歩合)

ALTER TABLE staff ADD COLUMN employment_type text DEFAULT 'full_time'
  CHECK (employment_type IN ('full_time', 'part_time', 'contractor'));

ALTER TABLE staff ADD COLUMN stage text
  CHECK (stage IN ('S1', 'S2', 'S3', 'S4', 'S5', 'S6'));

ALTER TABLE staff ADD COLUMN base_salary integer;
ALTER TABLE staff ADD COLUMN hourly_rate integer;
ALTER TABLE staff ADD COLUMN commission_rate numeric(5,4);
ALTER TABLE staff ADD COLUMN stage_started_at timestamptz;
