import { NextRequest, NextResponse } from 'next/server'
import { verifyLineWebhook, type LineWebhookBody } from '@/lib/line/webhook'
import { replyMessage } from '@/lib/line/client'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// LIFF URL or フォールバックURLを構築
function getSurveyUrl(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (liffId) return `https://liff.line.me/${liffId}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cookie.hair'
  return `${appUrl}/survey`
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-line-signature') || ''

  // 署名検証
  if (!verifyLineWebhook(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { events } = JSON.parse(body) as LineWebhookBody
  const supabase = createAdminClient()

  for (const event of events) {
    try {
      switch (event.type) {
        case 'follow': {
          // 友だち追加イベント
          const lineUserId = event.source.userId

          // ブロック解除時も follow イベントが再度飛ぶため、
          // blocked_line_users から必ず除去する（未登録ユーザー含む）
          await supabase
            .from('blocked_line_users')
            .delete()
            .eq('line_user_id', lineUserId)

          // 既存の顧客を検索 (line_user_id で)
          const { data: existing } = await supabase
            .from('customer')
            .select('id')
            .eq('line_user_id', lineUserId)
            .single()

          if (existing) {
            // 既存顧客: ブロック解除
            await supabase
              .from('customer')
              .update({
                line_blocked: false,
                line_friend_date: new Date().toISOString(),
              })
              .eq('id', existing.id)
          }
          // 新規の場合は顧客レコードを作成しない
          // → アンケート完了時（/api/survey）で初めてDBに登録される

          // 新規のみ: アンケートへ誘導メッセージを自動返信
          const surveyUrl = getSurveyUrl()
          if (event.replyToken && surveyUrl && !existing) {
            await replyMessage(event.replyToken, [
              {
                type: 'flex',
                altText: 'COOKIE 熊本 へようこそ！アンケートにご回答ください',
                contents: {
                  type: 'bubble',
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'md',
                    contents: [
                      {
                        type: 'text',
                        text: 'ようこそ！✂️',
                        weight: 'bold',
                        size: 'xl',
                        color: '#D97706',
                      },
                      {
                        type: 'text',
                        text: 'COOKIE 熊本 へようこそ！\n簡単なアンケートにご回答いただくと、ご来店がよりスムーズになります✨',
                        wrap: true,
                        size: 'sm',
                        color: '#666666',
                      },
                    ],
                  },
                  footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'button',
                        action: {
                          type: 'uri',
                          label: '📝 アンケートに回答する',
                          uri: surveyUrl,
                        },
                        style: 'primary',
                        color: '#D97706',
                      },
                    ],
                  },
                },
              },
            ])
          }
          break
        }

        case 'unfollow': {
          // ブロック（友だち解除）イベント
          const lineUserId = event.source.userId

          // 顧客テーブルのフラグ更新（登録済みユーザーの場合）
          await supabase
            .from('customer')
            .update({ line_blocked: true })
            .eq('line_user_id', lineUserId)

          // 未登録ユーザーにも対応するため、専用テーブルに永続化
          await supabase
            .from('blocked_line_users')
            .upsert(
              { line_user_id: lineUserId, blocked_at: new Date().toISOString() },
              { onConflict: 'line_user_id' }
            )
          break
        }
      }
    } catch (error) {
      console.error('Webhook event処理エラー:', error)
    }
  }

  return NextResponse.json({ status: 'ok' })
}
