'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Briefcase, ChevronDown, ChevronUp, Clock, ArrowUp, ArrowDown } from 'lucide-react'

const EMPLOYMENT_PASSWORD_KEY = 'employment_password'
const DEFAULT_PASSWORD = 'cookie2024'

function getEmploymentPassword(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(EMPLOYMENT_PASSWORD_KEY) || DEFAULT_PASSWORD
  }
  return DEFAULT_PASSWORD
}

export default function EmploymentPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>('honten')

  const handleAuth = () => {
    if (password === getEmploymentPassword()) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('パスワードが正しくありません')
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>雇用形態情報</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              閲覧にはパスワードが必要です
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-password">パスワード</Label>
              <Input
                id="emp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="パスワードを入力"
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <Button className="w-full" onClick={handleAuth} disabled={!password}>
              閲覧する
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">雇用形態</h2>
        <p className="text-muted-foreground mt-1">COOKIE 熊本 の雇用形態と報酬体系</p>
      </div>

      {/* 本店給与テーブル */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('honten')}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <span className="text-lg">本店給与テーブル</span>
                <p className="text-sm font-normal text-muted-foreground">ランク別の基本給・歩合・交通費（全て税抜計算）</p>
              </div>
            </div>
            {expandedSection === 'honten' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSection === 'honten' && (
          <CardContent className="space-y-6">
            {/* ランク別テーブル */}
            <div className="space-y-3">
              {[
                { rank: 'アシスタント', base: '150,000円', commission: 'なし', color: 'bg-gray-100 text-gray-700' },
                { rank: 'JRスタイリスト', base: '170,000円', commission: 'なし', color: 'bg-gray-100 text-gray-700' },
                { rank: 'スタイリスト', base: '189,000円', commission: '税抜売上の1%', color: 'bg-blue-100 text-blue-700' },
                { rank: 'トップスタイリスト', base: '210,000円', commission: '税抜40万以上の売上の10%', color: 'bg-amber-100 text-amber-700' },
                { rank: '店長/マネージャー', base: '230,000円', commission: '税抜総売上の1% + 個人指名売上40万以上の5%', color: 'bg-purple-100 text-purple-700' },
              ].map((item) => (
                <div key={item.rank} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${item.color}`}>{item.rank}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">基本給</span>
                      <p className="font-medium">{item.base}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">歩合</span>
                      <p className="font-medium">{item.commission}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">交通費</span>
                      <p className="font-medium">上限 5,000円</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 昇格基準 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <p className="font-semibold">昇格基準</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 p-2 bg-muted/30 rounded">
                  <span className="font-medium text-nowrap">アシスタント → JR</span>
                  <span className="text-muted-foreground">筆記試験、技術試験、勤務態度等に合格した者</span>
                </div>
                <div className="flex gap-2 p-2 bg-muted/30 rounded">
                  <span className="font-medium text-nowrap">JR → スタイリスト</span>
                  <span className="text-muted-foreground">規定人数の消化と技術試験をクリアし、面談過程を修了した者</span>
                </div>
                <div className="flex gap-2 p-2 bg-muted/30 rounded">
                  <span className="font-medium text-nowrap">スタ → トップ</span>
                  <span className="text-muted-foreground">総売上が3ヶ月合計300万をクリアした者</span>
                </div>
                <div className="flex gap-2 p-2 bg-muted/30 rounded">
                  <span className="font-medium text-nowrap">トップ → MG</span>
                  <span className="text-muted-foreground">店舗別の1ヶ月売上目標100万を超え、4ヶ月連続達成した者</span>
                </div>
              </div>
            </div>

            {/* 降格基準 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDown className="h-4 w-4 text-red-500" />
                <p className="font-semibold">降格基準</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 p-2 bg-red-50 rounded">
                  <span className="font-medium text-nowrap">MG → トップ</span>
                  <span className="text-muted-foreground">1ヶ月の売上目標を4ヶ月連続未達</span>
                </div>
                <div className="flex gap-2 p-2 bg-red-50 rounded">
                  <span className="font-medium text-nowrap">トップ → スタ</span>
                  <span className="text-muted-foreground">1ヶ月の売上目標を4ヶ月連続未達</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">※ 全ての売上等の数字は税抜計算です</p>
          </CardContent>
        )}
      </Card>

      {/* P: 時短社員（日当制） */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('P')}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <span className="text-lg">P：時短社員（日当制）</span>
                <p className="text-sm font-normal text-muted-foreground">日当ベースの時短勤務契約</p>
              </div>
            </div>
            {expandedSection === 'P' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSection === 'P' && (
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4">
              <p className="font-semibold mb-3">報酬体系</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">日当</span>
                  <p className="font-medium text-lg">8,000円 / 日</p>
                </div>
                <div>
                  <span className="text-muted-foreground">交通費</span>
                  <p className="font-medium">上限 5,000円 / 月</p>
                </div>
                <div>
                  <span className="text-muted-foreground">歩合</span>
                  <p className="font-medium">なし</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <p className="font-semibold mb-2">勤務条件</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>・1日の勤務時間は個別に設定（例：10:00〜16:00 等）</p>
                <p>・出勤日数は月ごとにシフトで決定</p>
                <p>・社会保険は勤務時間・日数に応じて適用判断</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-teal-50/50">
              <p className="font-semibold mb-2">月収目安</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between p-2 bg-white rounded">
                  <span>月12日出勤の場合</span>
                  <span className="font-bold">96,000円 + 交通費</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span>月16日出勤の場合</span>
                  <span className="font-bold">128,000円 + 交通費</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span>月20日出勤の場合</span>
                  <span className="font-bold">160,000円 + 交通費</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
