import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCircle, Link as LinkIcon } from 'lucide-react'
import { LineLinkButton } from '@/components/features/line-link-button'
import { getCachedStaffInfo } from '@/lib/cached-auth'

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function AccountSettingsPage() {
  // ログイン中の管理者情報を取得
  let info: {
    name: string
    email: string
    role: string
    isLineLinked: boolean
    authUserId: string | undefined
  }

  if (!isSupabaseConfigured) {
    info = {
      name: 'デモ管理者',
      email: 'demo@example.com',
      role: 'admin',
      isLineLinked: false,
      authUserId: undefined,
    }
  } else {
    const staff = await getCachedStaffInfo()
    if (!staff) redirect('/login')
    info = {
      name: staff.name,
      email: staff.email,
      role: staff.role,
      isLineLinked: !!staff.line_user_id,
      authUserId: staff.auth_user_id,
    }
  }

  const roleLabel = info.role === 'admin' ? '管理者' : 'スタッフ'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserCircle className="h-6 w-6" />
          アカウント設定
        </h2>
        <p className="text-muted-foreground mt-1">
          アカウント情報と外部サービス連携を管理します
        </p>
      </div>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">アカウント情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">名前</span>
            <span className="font-medium">{info.name}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">メールアドレス</span>
            <span className="font-medium">{info.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ロール</span>
            <span className="font-medium">{roleLabel}</span>
          </div>
        </CardContent>
      </Card>

      {/* LINE連携 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-green-600" />
            LINE連携
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            LINEアカウントを連携すると、LINEでログインできるようになり、
            施術ログ未入力アラートなどのスタッフ向け通知も受信できます
          </p>
        </CardHeader>
        <CardContent>
          <LineLinkButton
            isLinked={info.isLineLinked}
            authUserId={info.authUserId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
