-- ============================================
-- 00036 カルテ閲覧セッション（iPad QRログイン用）
-- iPad がセッション生成 → スマホが認証 → iPad が検知して画面切替
-- ============================================

CREATE TABLE IF NOT EXISTS karte_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code text NOT NULL UNIQUE,
  staff_line_user_id text,           -- 認証後にセット
  authenticated_at timestamptz,      -- 認証完了時刻
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- 古いセッションの自動削除用インデックス
CREATE INDEX IF NOT EXISTS idx_karte_sessions_expires ON karte_sessions (expires_at);

-- RLS
ALTER TABLE karte_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "karte_sessions_all" ON karte_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- anon もAPIルート経由でアクセスするため
CREATE POLICY "karte_sessions_anon" ON karte_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
