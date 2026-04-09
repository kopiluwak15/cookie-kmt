import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Staff } from '@/types'

/**
 * React.cache() でラップされた getStaffInfo
 * 同一リクエスト内で複数回呼ばれても、DBクエリは1回だけ実行される
 *
 * getSession() はローカルのCookie(JWT)を読むだけ（ネットワーク通信なし）
 * → getUser() はSupabaseサーバーに毎回問い合わせるため遅い
 * ミドルウェアで既にセッション検証済みなので getSession() で十分
 */
export const getCachedStaffInfo = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()

  return staff as Staff | null
})
