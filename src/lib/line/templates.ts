import type { LineMessage } from './client'

// DBテンプレートの変数を置換する共通関数
function replaceTemplateVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

// DBテンプレート本文からFlex Messageのbodyコンテンツを構築
// テンプレートは \n\n で段落を区切る
// 段落0: メイン本文
// 段落1〜(n-1): セパレーター付き情報ブロック
// 段落n (最後): 小さめの注記テキスト
function buildBodyFromTemplate(
  bodyText: string,
  variables: Record<string, string>,
  options?: { couponText?: string }
): Record<string, unknown>[] {
  const processed = replaceTemplateVariables(bodyText, variables)
  const blocks = processed.split('\n\n').filter((b) => b.trim())

  const contents: Record<string, unknown>[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim()
    if (!block) continue

    const isFirst = i === 0
    const isLast = i === blocks.length - 1 && blocks.length > 1

    // クーポンテキスト部分を特別なスタイルで表示
    if (options?.couponText && block.includes(options.couponText)) {
      contents.push({ type: 'separator', margin: 'lg' })
      contents.push({
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: block,
            wrap: true,
            size: 'sm',
            color: '#E74C3C',
            weight: 'bold',
          },
        ],
        margin: 'lg',
        backgroundColor: '#FFF5F5',
        paddingAll: '10px',
        cornerRadius: '8px',
      })
    } else if (isFirst) {
      // 最初のブロック: メイン本文（\n は改行として保持）
      contents.push({
        type: 'text',
        text: block,
        wrap: true,
        size: 'sm',
        margin: 'none',
      })
    } else if (isLast) {
      // 最後のブロック: 注記テキスト（小さめ・グレー）
      contents.push({
        type: 'text',
        text: block,
        wrap: true,
        size: 'xs',
        color: '#888888',
        margin: 'lg',
      })
    } else {
      // 中間ブロック: セパレーター + 情報テキスト
      contents.push({ type: 'separator', margin: 'lg' })
      contents.push({
        type: 'text',
        text: block,
        wrap: true,
        size: 'sm',
        margin: 'lg',
      })
    }
  }

  return contents
}

// DBテンプレートからFlex Messageを構築する汎用関数
export function buildMessageFromTemplate(params: {
  bodyText: string
  altText: string
  variables: Record<string, string>
  bookingUrl: string
  buttonLabel?: string
  couponText?: string
}): LineMessage {
  const bodyContents = buildBodyFromTemplate(
    params.bodyText,
    params.variables,
    { couponText: params.couponText }
  )

  return {
    type: 'flex',
    altText: params.altText,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'COOKIE 熊本',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          },
        ],
        backgroundColor: '#F5E6CC',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: '15px',
      },
      ...(params.bookingUrl
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: params.buttonLabel || 'ご予約はこちら',
                    uri: params.bookingUrl,
                  },
                  style: 'primary',
                  color: '#8B6914',
                },
              ],
              paddingAll: '15px',
            },
          }
        : {}),
    },
  }
}

// サンキューLINE Flex Message
export function buildThankYouMessage(params: {
  customerName: string
  styleName: string
  cycleDays: number
  nextVisitDate?: string // "X月Y日" 形式
  bookingUrl: string
  bodyText?: string
}): LineMessage {
  const nvd = params.nextVisitDate || `${params.cycleDays}日後`

  // DBテンプレートがある場合はそちらを使用
  if (params.bodyText) {
    return buildMessageFromTemplate({
      bodyText: params.bodyText,
      altText: `${params.customerName}様、本日はご来店ありがとうございました`,
      variables: {
        customer_name: params.customerName,
        style_name: params.styleName,
        cycle_days: String(params.cycleDays),
        next_visit_date: nvd,
        booking_url: params.bookingUrl,
      },
      bookingUrl: params.bookingUrl,
      buttonLabel: '次回予約はこちら',
    })
  }

  // フォールバック: ハードコード版
  return {
    type: 'flex',
    altText: `${params.customerName}様、本日はご来店ありがとうございました`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'COOKIE 熊本',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          },
        ],
        backgroundColor: '#F5E6CC',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${params.customerName}様`,
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: '本日はご来店いただき\nありがとうございました！',
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'text',
            text: `今回のスタイル：${params.styleName}`,
            size: 'sm',
            margin: 'lg',
          },
          {
            type: 'text',
            text: `次回ご来店は ${nvd}（${params.cycleDays}日後）が目安です。`,
            wrap: true,
            size: 'sm',
            weight: 'bold',
            margin: 'sm',
          },
          {
            type: 'text',
            text: '予約はこちらからどうぞ ↓',
            wrap: true,
            size: 'xs',
            color: '#888888',
            margin: 'lg',
          },
        ],
        paddingAll: '15px',
      },
      ...(params.bookingUrl
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '次回予約はこちら',
                    uri: params.bookingUrl,
                  },
                  style: 'primary',
                  color: '#8B6914',
                },
              ],
              paddingAll: '15px',
            },
          }
        : {}),
    },
  }
}

// リマインド①LINE Flex Message
export function buildReminder1Message(params: {
  customerName: string
  styleName: string
  cycleDays: number
  bookingUrl: string
  bodyText?: string
}): LineMessage {
  // DBテンプレートがある場合はそちらを使用
  if (params.bodyText) {
    return buildMessageFromTemplate({
      bodyText: params.bodyText,
      altText: `${params.customerName}様、そろそろカットの時期です`,
      variables: {
        customer_name: params.customerName,
        style_name: params.styleName,
        cycle_days: String(params.cycleDays),
      },
      bookingUrl: params.bookingUrl,
    })
  }

  // フォールバック: ハードコード版
  return {
    type: 'flex',
    altText: `${params.customerName}様、そろそろカットの時期です`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'COOKIE 熊本',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          },
        ],
        backgroundColor: '#F5E6CC',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${params.customerName}様`,
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: `前回のご来店から${params.cycleDays}日が経ちました。`,
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'そろそろカットの時期ですね！',
            wrap: true,
            size: 'sm',
            margin: 'sm',
            weight: 'bold',
          },
          {
            type: 'text',
            text: 'ご都合の良い日時にご予約ください。',
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
        ],
        paddingAll: '15px',
      },
      ...(params.bookingUrl
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'ご予約はこちら',
                    uri: params.bookingUrl,
                  },
                  style: 'primary',
                  color: '#8B6914',
                },
              ],
              paddingAll: '15px',
            },
          }
        : {}),
    },
  }
}

// リマインド②LINE Flex Message (クーポン付き)
export function buildReminder2Message(params: {
  customerName: string
  couponText: string
  bookingUrl: string
  bodyText?: string
}): LineMessage {
  // DBテンプレートがある場合はそちらを使用
  if (params.bodyText) {
    return buildMessageFromTemplate({
      bodyText: params.bodyText,
      altText: `${params.customerName}様、またのご来店をお待ちしております`,
      variables: {
        customer_name: params.customerName,
        coupon_text: params.couponText,
      },
      bookingUrl: params.bookingUrl,
      couponText: params.couponText,
    })
  }

  // フォールバック: ハードコード版
  return {
    type: 'flex',
    altText: `${params.customerName}様、またのご来店をお待ちしております`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'COOKIE 熊本',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          },
        ],
        backgroundColor: '#F5E6CC',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${params.customerName}様`,
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: 'お久しぶりです！\nCOOKIE 熊本です。',
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'スタイルの維持のため、\nそろそろメンテナンスはいかがでしょうか？',
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: params.couponText,
                wrap: true,
                size: 'sm',
                color: '#E74C3C',
                weight: 'bold',
              },
            ],
            margin: 'lg',
            backgroundColor: '#FFF5F5',
            paddingAll: '10px',
            cornerRadius: '8px',
          },
        ],
        paddingAll: '15px',
      },
      ...(params.bookingUrl
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'ご予約はこちら',
                    uri: params.bookingUrl,
                  },
                  style: 'primary',
                  color: '#8B6914',
                },
              ],
              paddingAll: '15px',
            },
          }
        : {}),
    },
  }
}

// カスタムLINE Flex Message（リピート分析等からの手動送信）
export function buildCustomMessage(params: {
  customerName: string
  messageText: string
}): LineMessage {
  return {
    type: 'flex',
    altText: 'COOKIE 熊本からのお知らせ',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'COOKIE 熊本',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          },
        ],
        backgroundColor: '#F5E6CC',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${params.customerName}様`,
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: params.messageText,
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
        ],
        paddingAll: '15px',
      },
    },
  }
}

// 休眠顧客LINE Flex Message
export function buildDormantMessage(params: {
  customerName: string
  weekdayText: string
  bookingUrl: string
  bodyText?: string
}): LineMessage {
  // DBテンプレートがある場合はそちらを使用
  if (params.bodyText) {
    return buildMessageFromTemplate({
      bodyText: params.bodyText,
      altText: `${params.customerName}様、またのご来店をお待ちしております`,
      variables: {
        customer_name: params.customerName,
        weekday_text: params.weekdayText,
      },
      bookingUrl: params.bookingUrl,
    })
  }

  // フォールバック: ハードコード版
  return {
    type: 'flex',
    altText: `${params.customerName}様、またのご来店をお待ちしております`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'COOKIE 熊本',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          },
        ],
        backgroundColor: '#F5E6CC',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${params.customerName}様`,
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: 'お元気ですか？\nCOOKIE 熊本です。',
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
          {
            type: 'text',
            text: params.weekdayText,
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'またのご来店をお待ちしております。',
            wrap: true,
            size: 'sm',
            margin: 'md',
          },
        ],
        paddingAll: '15px',
      },
      ...(params.bookingUrl
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'ご予約はこちら',
                    uri: params.bookingUrl,
                  },
                  style: 'primary',
                  color: '#8B6914',
                },
              ],
              paddingAll: '15px',
            },
          }
        : {}),
    },
  }
}

// メンテナンスチケットLINE（コンセプトメニュー後の自動配信）
export function buildMaintenanceMessage(params: {
  customerName: string
  ticketLabel: string
  ticketValidUntil: string
  bookingUrl: string
  bodyText?: string
}): LineMessage {
  if (params.bodyText) {
    return buildMessageFromTemplate({
      bodyText: params.bodyText,
      altText: `${params.customerName}様、${params.ticketLabel}が届きました`,
      variables: {
        customer_name: params.customerName,
        ticket_valid_until: params.ticketValidUntil,
        booking_url: params.bookingUrl,
      },
      bookingUrl: params.bookingUrl,
      buttonLabel: 'チケットを使って予約',
    })
  }

  return {
    type: 'flex',
    altText: `${params.customerName}様、${params.ticketLabel}が届きました`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'COOKIE 熊本',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          },
        ],
        backgroundColor: '#F5E6CC',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${params.customerName}様`,
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: `🎟 ${params.ticketLabel}`,
            wrap: true,
            size: 'md',
            weight: 'bold',
            color: '#8B6914',
            margin: 'md',
          },
          {
            type: 'text',
            text: `有効期限: ${params.ticketValidUntil}`,
            wrap: true,
            size: 'sm',
            margin: 'sm',
          },
          {
            type: 'text',
            text: 'コンセプトメニュー後の状態維持にぜひご活用ください。',
            wrap: true,
            size: 'xs',
            color: '#888888',
            margin: 'lg',
          },
        ],
        paddingAll: '15px',
      },
      ...(params.bookingUrl
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'チケットを使って予約',
                    uri: params.bookingUrl,
                  },
                  style: 'primary',
                  color: '#8B6914',
                },
              ],
              paddingAll: '15px',
            },
          }
        : {}),
    },
  }
}
