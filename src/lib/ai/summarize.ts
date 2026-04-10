/**
 * src/lib/ai/summarize.ts
 *
 * 症例要約ラッパー：
 *  - ANTHROPIC_API_KEY があれば Claude（Sonnet）を優先
 *  - なければ OpenAI（gpt-4o-mini）にフォールバック
 *  - どちらも無ければ throw
 *
 * 依存ゼロ（fetch のみ）。SDK を入れないのは Edge/Node どちらでも
 * 動かせるようにするためと、bundle を小さく保つため。
 */

export interface SummarizeInput {
  concernTags: string[]
  concernRaw?: string | null
  treatmentTags: string[]
  treatmentRaw?: string | null
  counselingNotes?: string | null
  treatmentFindings?: string | null
  nextProposal?: string | null
  customerContext?: {
    visitCount?: number
    previousStyles?: string[]
  }
}

export interface SummarizeResult {
  summary: string
  model: string
}

const SYSTEM_PROMPT = `あなたはヘアサロン「COOKIE 熊本」の施術データを分析するアシスタントです。
スタッフが入力した「悩み」と「施術要点」を読み取り、以下のフォーマットで120〜180字にまとめてください。

【ポイント】 …施術で最も重要だった点を1文
【次回への申し送り】 …次回担当スタッフが見るべき点を1文
【仮説】 …この施術がリピートに繋がりそうな理由を1文

敬語は不要、簡潔に。固有名詞・数値はそのまま残す。架空情報は足さないこと。`

function buildUserPrompt(input: SummarizeInput): string {
  const lines: string[] = []
  lines.push('## 悩み')
  if (input.concernTags.length > 0) {
    lines.push(`タグ: ${input.concernTags.join(' / ')}`)
  }
  if (input.concernRaw?.trim()) {
    lines.push(`詳細: ${input.concernRaw.trim()}`)
  }
  lines.push('')
  lines.push('## 施術要点')
  if (input.treatmentTags.length > 0) {
    lines.push(`タグ: ${input.treatmentTags.join(' / ')}`)
  }
  if (input.treatmentRaw?.trim()) {
    lines.push(`詳細: ${input.treatmentRaw.trim()}`)
  }
  if (input.counselingNotes?.trim()) {
    lines.push('')
    lines.push('## カウンセリングで出てきた話')
    lines.push(input.counselingNotes.trim())
  }
  if (input.treatmentFindings?.trim()) {
    lines.push('')
    lines.push('## 施術での発見')
    lines.push(input.treatmentFindings.trim())
  }
  if (input.nextProposal?.trim()) {
    lines.push('')
    lines.push('## 次回への提案・申し送り')
    lines.push(input.nextProposal.trim())
  }
  if (input.customerContext) {
    lines.push('')
    lines.push('## 顧客コンテキスト')
    if (input.customerContext.visitCount != null) {
      lines.push(`来店回数: ${input.customerContext.visitCount}回`)
    }
    if (input.customerContext.previousStyles?.length) {
      lines.push(`過去スタイル: ${input.customerContext.previousStyles.join(', ')}`)
    }
  }
  return lines.join('\n')
}

// ============================================
// Claude (Anthropic)
// ============================================
async function summarizeWithClaude(input: SummarizeInput): Promise<SummarizeResult> {
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
      max_tokens: 400,
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
  const summary = json.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim()

  return { summary, model }
}

// ============================================
// OpenAI
// ============================================
async function summarizeWithOpenAI(input: SummarizeInput): Promise<SummarizeResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const model = process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 400,
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
  const summary = (json.choices[0]?.message?.content || '').trim()

  return { summary, model }
}

// ============================================
// 公開API
// ============================================
export async function summarizeCase(
  input: SummarizeInput
): Promise<SummarizeResult> {
  // Claude 優先、なければ OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    return summarizeWithClaude(input)
  }
  if (process.env.OPENAI_API_KEY) {
    return summarizeWithOpenAI(input)
  }
  throw new Error('No AI API key configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)')
}

export function hasAiConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)
}
