const LINE_API_BASE = 'https://api.line.me/v2/bot'

export interface LineMessage {
  type: string
  altText?: string
  contents?: Record<string, unknown>
  text?: string
}

export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<{ requestId: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません')

  const response = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error('LINE reply failed:', response.status, error)
    throw new Error(`LINE Reply API エラー (${response.status}): ${JSON.stringify(error)}`)
  }

  return {
    requestId: response.headers.get('x-line-request-id') || '',
  }
}

export async function pushMessage(
  userId: string,
  messages: LineMessage[]
): Promise<{ requestId: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません')

  const response = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const status = response.status

    // ユーザーがブロックしている場合
    if (status === 400 && error?.message?.includes('not found')) {
      throw new Error('LINE_BLOCKED')
    }

    throw new Error(`LINE API エラー (${status}): ${JSON.stringify(error)}`)
  }

  return {
    requestId: response.headers.get('x-line-request-id') || '',
  }
}
