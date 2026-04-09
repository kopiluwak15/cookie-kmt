import Link from 'next/link'
import { Scissors, BarChart3, MessageSquare, Users } from 'lucide-react'

export default function TopPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">COOKIE 熊本</h1>
          <Link
            href="/login"
            className="px-5 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-36 text-center">
          <div className="inline-block px-4 py-1.5 mb-6 text-xs font-medium tracking-wider uppercase bg-amber-600/20 text-amber-400 rounded-full border border-amber-600/30">
            メンズ美容室専用CRM
          </div>
          <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            リピートを、
            <br />
            <span className="text-amber-500">仕組み</span>にする。
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            顧客の来店周期を管理し、最適なタイミングで
            <br className="hidden md:block" />
            LINEを自動配信。スタッフの作業は施術ログ入力だけ。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3.5 text-base font-medium bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              管理画面にログイン
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 text-base font-medium border border-gray-600 hover:border-gray-500 hover:bg-gray-800 rounded-lg transition-colors"
            >
              機能を見る
            </a>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section id="features" className="py-20 md:py-28 bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              売上を伸ばす<span className="text-amber-500">4つの機能</span>
            </h3>
            <p className="text-gray-400 text-lg">
              客数 × 来店周期の改善で、リピート率を最大化
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <FeatureCard
              icon={<Scissors className="h-6 w-6" />}
              title="施術ログ入力"
              description="スタッフはタブレットで顧客を選んでタップするだけ。施術記録と同時にサンキューLINEを自動送信します。"
              color="amber"
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="LINE自動配信"
              description="来店周期に合わせてリマインドLINEを自動送信。休眠顧客へのフォローアップも自動で行います。"
              color="blue"
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="リピート分析"
              description="新規・再来・固定・リターンの属性別にコホート分析。どの層にアプローチすべきかが一目でわかります。"
              color="green"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="顧客カルテ"
              description="来店履歴・スタイル傾向・LINE送信履歴をカルテ形式で一元管理。次回提案の精度が上がります。"
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* フロー */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              シンプルな<span className="text-amber-500">運用フロー</span>
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <FlowStep
              step="01"
              title="施術ログを入力"
              description="施術後にスタッフが顧客・メニュー・スタイルを選択して記録"
            />
            <FlowStep
              step="02"
              title="自動でLINE送信"
              description="サンキューLINE → リマインド① → リマインド② → 休眠フォロー"
            />
            <FlowStep
              step="03"
              title="データで改善"
              description="ダッシュボードとリピート分析で施策の効果を確認・改善"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-t border-b border-amber-600/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            今すぐ始めましょう
          </h3>
          <p className="text-gray-400 mb-8">
            スタッフアカウントでログインして、施術ログの入力を開始できます
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 text-lg font-medium bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
          >
            ログイン
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} COOKIE 熊本. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    green: 'bg-green-600/20 text-green-400 border-green-600/30',
    purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  }

  return (
    <div className="p-6 md:p-8 rounded-xl bg-gray-800/80 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg border mb-5 ${colorMap[color]}`}>
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-3">{title}</h4>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

function FlowStep({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-600/20 text-amber-500 text-2xl font-bold mb-4 border border-amber-600/30">
        {step}
      </div>
      <h4 className="text-lg font-bold mb-2">{title}</h4>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
