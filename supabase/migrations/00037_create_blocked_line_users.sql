-- ============================================
-- 00037 blocked_line_users
-- 公式LINEをブロックしたユーザーの line_user_id を永続化する。
--
-- 背景:
--   customer テーブルには「アンケート/カルテ登録済み」のユーザーしか
--   レコードがないため、未登録のまま LIFF 認証だけ通って後でブロック
--   したユーザーの状態を webhook の unfollow で記録できない
--   （update 対象が存在しないため無視される）。
--   その結果、次回スキャン時に LINE Profile API は 200 を返し、
--   customer.line_blocked でも検知できず、ゲートをすり抜けて登録
--   フローに進んでしまう。
--
--   本テーブルで line_user_id 単位のブロック状態を独立管理し、
--   webhook の follow/unfollow で upsert / delete する。
-- ============================================

CREATE TABLE IF NOT EXISTS blocked_line_users (
  line_user_id text PRIMARY KEY,
  blocked_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE blocked_line_users IS 'LINE公式アカウントをブロックしているユーザーのline_user_id。webhookのunfollow/follow で管理。';
COMMENT ON COLUMN blocked_line_users.line_user_id IS 'ブロックしているLINEユーザーID';
COMMENT ON COLUMN blocked_line_users.blocked_at IS '最初にブロックが検知された時刻';

-- RLS は有効化しつつ、全アクセスはAdmin/Server Actionからのみとする。
-- 匿名/認証済みともに直接の SELECT/INSERT/UPDATE/DELETE は不許可（ポリシー未定義）
ALTER TABLE blocked_line_users ENABLE ROW LEVEL SECURITY;
