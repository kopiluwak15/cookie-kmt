/**
 * src/lib/ai/suggest.ts
 *
 * 「お客様の悩み × 過去症例 × メニュー」から
 * 角度の高い施術提案 TOP3 を生成する。
 *
 *  - ANTHROPIC_API_KEY があれば Claude（Sonnet）を優先
 *  - なければ OpenAI（gpt-4o-mini）にフォールバック
 *  - どちらも無ければ throw
 *
 * 依存ゼロ（fetch のみ）。
 */

export interface SuggestInput {
  /** 顧客の名前（プロンプトで自然な日本語にするため） */
  customerName?: string
  /** 来店回数 */
  visitCount?: number
  /** 今回入力されたカルテ・お悩みアンケートから抽出した「悩み」リスト */
  worries: string[]
  /** 自由記述（カルテ「気になっていること - その他」など） */
  worriesFree?: string | null
  /** コンセプトアンケートの症状タグ */
  symptoms?: string[]
  /** コンセプトアンケートで挙げられた「成功条件」（こうなったら嬉しい） */
  successCriteria?: string[]
  /** 顧客が選んだ希望メニュー（4500ベースの大カテゴリ） */
  selectedMenus?: string[]
  /** 「気になる部位」リスト（前髪・トップなど） */
  spots?: string[]
  /** 過去自分の施術履歴（最新3件まで） */
  pastVisits?: Array<{
    date: string
    menu: string
    notes?: string | null
  }>
  /** 同じ悩みを持つ他のお客様の過去症例（最大5件） */
  similarCases?: Array<{
    concernTags: string[]
    treatmentTags: string[]
    aiSummary?: string | null
  }>
  /** お店で提供可能なメニュー（active のもの） */
  availableMenus: Array<{
    name: string
    category: string | null
    estimatedMinutes: number
    price: number | null
    isConcept: boolean
  }>
}

export interface SuggestionItem {
  /** 提案の見出し（30字以内） */
  title: string
  /** 推奨メニュー（availableMenus.name の中から選ぶ） */
  menus: string[]
  /** なぜこの施術か（80字以内） */
  reason: string
  /** 期待される効果（60字以内） */
  expected: string
  /** 信頼度（low/mid/high） */
  confidence: 'low' | 'mid' | 'high'
}

export interface SuggestResult {
  suggestions: SuggestionItem[]
  model: string
}

const SYSTEM_PROMPT = `あなたはヘアサロン「COOKIE 熊本」のベテランスタイリストです。
お客様が記入したカウンセリングシート、過去の自分の来店履歴、そして「同じ悩みを持つ他のお客様の症例（他スタッフが記録したもの）」を参考に、
担当スタッフが「次の施術プラン」を即決できるように、角度の高い提案 TOP3 を返してください。

ルール:
1. 必ず「availableMenus」に含まれるメニュー名のみを menus に入れる（架空のメニュー名禁止）
2. 各提案は「お客様の悩みの主因に直撃する」「過去症例の成功パターンを参照する」を意識
3. similarCases が空の場合は推測度を confidence: 'low' に下げる
4. reason / expected は短く、断定的に。営業文句や過剰な装飾は禁止
5. 同じメニューを 3案に重複させない。組み合わせの幅を見せる
6. 既に選択されているメニュー (selectedMenus) があれば、それを 1案目で活かす形にする

返答は必ず以下の JSON のみ（マークダウン枠線、説明文、コメント禁止）:

{
  "suggestions": [
    {
      "title": "...",
      "menus": ["メニュー名"],
      "reason": "...",
      "expected": "...",
      "confidence": "low" | "mid" | "high"
    }
  ]
}
`

function buildUserPrompt(input: SuggestInput): string {
  const lines: string[] = []

  lines.push('## お客様')
  if (input.customerName) lines.push(`名前: ${input.customerName}`)
  if (input.visitCount != null) lines.push(`来店回数: ${input.visitCount}回`)
  if (input.spots && input.spots.length > 0) {
    lines.push(`気になる部位: ${input.spots.join(', ')}`)
  }
  lines.push('')

  lines.push('## 今回の悩み')
  if (input.worries.length > 0) {
    lines.push(`カルテで選択: ${input.worries.join(' / ')}`)
  }
  if (input.symptoms && input.symptoms.length > 0) {
    lines.push(`お悩み詳細: ${input.symptoms.join(' / ')}`)
  }
  if (input.worriesFree?.trim()) {
    lines.push(`自由記述: ${input.worriesFree.trim()}`)
  }
  if (input.successCriteria && input.successCriteria.length > 0) {
    lines.push(`こうなったら嬉しい: ${input.successCriteria.join(' / ')}`)
  }
  lines.push('')

  if (input.selectedMenus && input.selectedMenus.length > 0) {
    lines.push('## お客様がカルテで希望したカテゴリ')
    lines.push(input.selectedMenus.join(' / '))
    lines.push('')
  }

  if (input.pastVisits && input.pastVisits.length > 0) {
    lines.push('## このお客様の過去履歴')
    for (const v of input.pastVisits) {
      lines.push(`- ${v.date} ${v.menu}${v.notes ? ` / ${v.notes}` : ''}`)
    }
    lines.push('')
  }

  if (input.similarCases && input.similarCases.length > 0) {
    lines.push('## 同じ悩みの他お客様の症例（参考）')
    for (const c of input.similarCases.slice(0, 5)) {
      lines.push(
        `- 悩み: ${c.concernTags.join('/')} → 施術: ${c.treatmentTags.join('/')}` +
          (c.aiSummary ? ` / メモ: ${c.aiSummary.slice(0, 100)}` : '')
      )
    }
    lines.push('')
  } else {
    lines.push('## 同じ悩みの他お客様の症例')
    lines.push('（まだ症例データが少ないため、一般論で提案してください）')
    lines.push('')
  }

  lines.push('## availableMenus（このリストの name のみを使用）')
  for (const m of input.availableMenus) {
    const tag = m.isConcept ? '[コンセプト]' : ''
    lines.push(
      `- ${m.name} ${tag} (${m.category || 'その他'} / ${m.estimatedMinutes}分${
        m.price != null ? ` / ¥${m.price.toLocaleString()}` : ''
      })`
    )
  }

  return lines.join('\n')
}

// ============================================
// Claude
// ============================================
async function suggestWithClaude(input: SuggestInput): Promise<SuggestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude API error ${res.status}: ${text}`)
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; text: string }>
  }
  const text = json.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')

  return { suggestions: parseSuggestions(text), model }
}

// ============================================
// OpenAI
// ============================================
async function suggestWithOpenAI(input: SuggestInput): Promise<SuggestResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')
  const model = process.env.OPENAI_SUGGEST_MODEL || 'gpt-4o-mini'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${text}`)
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const text = json.choices[0]?.message?.content || ''
  return { suggestions: parseSuggestions(text), model }
}

// ============================================
// JSON パース（モデルがマークダウン枠線で返すパターンに耐性）
// ============================================
function parseSuggestions(text: string): SuggestionItem[] {
  // ```json ... ``` を剥がす
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  // 余計な前置きがある場合は JSON 部分を抽出
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace > 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`AI返答のJSONパース失敗: ${(e as Error).message}\n--- raw ---\n${text.slice(0, 500)}`)
  }
  const obj = parsed as { suggestions?: unknown }
  if (!Array.isArray(obj.suggestions)) {
    throw new Error('AI返答に suggestions 配列が含まれていません')
  }

  return (obj.suggestions as unknown[])
    .map((s) => {
      const x = s as Record<string, unknown>
      return {
        title: String(x.title || ''),
        menus: Array.isArray(x.menus) ? (x.menus as string[]).map(String) : [],
        reason: String(x.reason || ''),
        expected: String(x.expected || ''),
        confidence: (['low', 'mid', 'high'] as const).includes(
          x.confidence as 'low' | 'mid' | 'high'
        )
          ? (x.confidence as 'low' | 'mid' | 'high')
          : 'mid',
      }
    })
    .filter((s) => s.title && s.reason)
    .slice(0, 3)
}

// ============================================
// 公開API
// ============================================
export async function suggestTreatments(input: SuggestInput): Promise<SuggestResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    return suggestWithClaude(input)
  }
  if (process.env.OPENAI_API_KEY) {
    return suggestWithOpenAI(input)
  }
  throw new Error('No AI API key configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)')
}

export function hasAiSuggestConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)
}
