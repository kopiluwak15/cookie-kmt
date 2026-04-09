'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' }
  }

  // 元のアクセス先（QRコード等から遷移してきた場合）
  const nextRaw = formData.get('next')
  const next = typeof nextRaw === 'string' && nextRaw.startsWith('/') && !nextRaw.startsWith('//')
    ? nextRaw
    : null

  // ロールに基づいてリダイレクト先を決定
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: staff } = await supabase
      .from('staff')
      .select('role, must_change_password')
      .eq('auth_user_id', user.id)
      .single()

    // 初回パスワード変更が必要な場合
    if (staff?.must_change_password) {
      redirect('/change-password')
    }

    // next が指定されていればそこへ
    if (next) {
      redirect(next)
    }

    if (staff?.role === 'admin') {
      redirect('/admin/dashboard')
    }
  }

  redirect('/staff/visit-log')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getStaffInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  return staff
}

// パスワード変更（初回ログイン時）
export async function changePassword(formData: FormData) {
  const supabase = await createClient()

  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!newPassword || !confirmPassword) {
    return { error: 'パスワードを入力してください' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'パスワードが一致しません' }
  }

  if (newPassword.length < 6) {
    return { error: 'パスワードは6文字以上で入力してください' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { error: `パスワードの変更に失敗しました: ${error.message}` }
  }

  // must_change_password フラグを false に更新
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const adminClient = createAdminClient()
    await adminClient
      .from('staff')
      .update({ must_change_password: false })
      .eq('auth_user_id', user.id)

    // ロールに基づいてリダイレクト先を決定
    const { data: staff } = await supabase
      .from('staff')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (staff?.role === 'admin') {
      redirect('/admin/dashboard')
    }
  }

  redirect('/staff/visit-log')
}

// パスワードリセットメール送信
export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  if (!email) {
    return { error: 'メールアドレスを入力してください' }
  }

  // ヘッダーからオリジンを取得
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'app.cookie.hair'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const origin = `${protocol}://${host}`

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/confirm?next=/reset-password`,
  })

  // セキュリティ上、メールが存在するかどうかに関わらず成功を返す
  return { success: true }
}

// パスワード再設定（メールリンク経由）
export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!newPassword || !confirmPassword) {
    return { error: 'パスワードを入力してください' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'パスワードが一致しません' }
  }

  if (newPassword.length < 6) {
    return { error: 'パスワードは6文字以上で入力してください' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { error: `パスワードの再設定に失敗しました: ${error.message}` }
  }

  // must_change_password フラグも false にする
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const adminClient = createAdminClient()
    await adminClient
      .from('staff')
      .update({ must_change_password: false })
      .eq('auth_user_id', user.id)
  }

  // ログアウトしてからログイン画面にリダイレクト
  await supabase.auth.signOut()
  redirect('/login')
}
