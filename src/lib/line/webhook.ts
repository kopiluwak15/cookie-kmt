import { validateSignature } from '@line/bot-sdk'

export function verifyLineWebhook(
  body: string,
  signature: string
): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) throw new Error('LINE_CHANNEL_SECRET が設定されていません')
  return validateSignature(body, channelSecret, signature)
}

export interface LineEvent {
  type: string
  source: {
    type: string
    userId: string
  }
  timestamp: number
  replyToken?: string
  message?: {
    type: string
    text?: string
  }
}

export interface LineWebhookBody {
  events: LineEvent[]
}
