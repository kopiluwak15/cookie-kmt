# cookie-kmt LINE CRM System

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkopiluwak15%2Fcookie-kmt&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,OPENAI_API_KEY,NEXT_PUBLIC_LIFF_ID,LINE_CHANNEL_ID,LINE_CHANNEL_ACCESS_TOKEN,LINE_CHANNEL_SECRET&project-name=cookie-kmt&repository-name=cookie-kmt)

縮毛矯正・髪質改善専門店 **cookie-kmt** のための LINE 連携 CRM システム。

**最重要KPI：「悩み→施術→再来店」の再現性を可視化**

---

## 🎯 システムの目的

従来の美容室では、カウンセリング中に施術メニューを提案することが多く、本来の「悩みを解決する」という領域に届きにくい。

cookie-kmt は **「専門店化」** により、お客様が来店前にメニューを決定済み → カウンセリング＝悩みに寄り添う時間を実現。

これにより：
- 🎯 顧客満足度が向上
- 📊 店舗の専門的技術が向上
- 🔄 メソッドの再現性が生まれる

---

## 📊 最重要4KPI

| # | 指標 | 意味 |
|----|------|------|
| 1 | **コンセプトメニュー売上構成比** | 専門店化の進捗 |
| 2 | **構成比の推移** | 転換速度 |
| 3 | **技術資産の蓄積** | メソッドの再現性（悩み×施術×結果） |
| 4 | **コンセプトリピート率 ⭐最重要⭐** | 再現性の成功度 |

---

## 🔄 お客様フロー

```
① 来店 → QR読込 → LINE友達登録
② アンケート記入（本日メニュー選択）
   - レギュラー → 通常フロー
   - コンセプト → 悩みアンケートへ誘導
③ カウンセリング → 施術
④ 施術終了 → スタッフが施術ログ入力（音声→AI整形）
⑤ サンキューLINE配信
⑥ リマインドLINE（スタイル周期別）
⑦ リピート来店 → ♾️
```

---

## 🖥️ スタッフ施術ログ入力フロー

### レギュラーメニュー
```
基本ログ（メニュー・金額・スタイル・担当） → 保存 → サンキューLINE
```

### コンセプトメニュー ⭐
```
基本ログ → 詳細ログ入力
  ├─ 【お客様側】悩みアンケート（既に済み）
  └─ 【スタッフ側】施術詳細（治療法・化学薬品・結果）
            ↓
         保存 → サンキューLINE

※ 「悩み → 施術 → 再来店」の再現性データを蓄積
```

---

## 💰 インセンティブシステム

**5% 歩合制**（コンセプト施術のみ）

```
コンセプト施術が含まれた総金額（税抜） × 5% = インセンティブ

例）
  縮毛矯正 ¥12,000 + トリートメント ¥3,000 = ¥15,000
  インセンティブ = ¥750

✨ スタッフページで毎日見える化
  - 今月の施術数 / リピート数 / 獲得額
  - 店舗平均との比較
```

---

## 🗂️ プロジェクト構成

```
cookie-kmt/
├─ app/
│  ├─ page.tsx                 # ランディング
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ api/
│  │  ├─ health/
│  │  ├─ line/
│  │  ├─ customers/
│  │  ├─ staff/
│  │  ├─ visits/
│  │  └─ analytics/
│  ├─ customer/
│  │  ├─ checkin/              # QRチェックイン → LIFF
│  │  ├─ questionnaire/        # アンケート
│  │  └─ profile/              # 顧客プロフィール
│  ├─ staff/
│  │  ├─ login/
│  │  ├─ dashboard/
│  │  ├─ visits/               # 本日来客一覧
│  │  └─ visit-log/            # 施術ログ入力
│  └─ admin/
│     ├─ dashboard/            # ダッシュボード
│     ├─ sales/                # 売上分析
│     ├─ repeat/               # リピート分析
│     ├─ customers/            # 顧客管理
│     ├─ staff/                # スタッフ管理
│     ├─ settings/             # 店舗・メニュー・スタイル
│     ├─ campaigns/            # キャンペーン
│     └─ qr/                   # QR表示
├─ lib/
│  ├─ supabase.ts
│  └─ constants.ts
├─ supabase/
│  └─ migrations/
│     └─ 001_initial_schema.sql
├─ public/
├─ package.json
├─ tsconfig.json
├─ tailwind.config.js
├─ next.config.js
└─ README.md
```

---

## 🛠️ セットアップ

### 1. 環境変数設定

`.env.local` を作成（`.env.example` をコピー）：

```bash
cp .env.example .env.local
```

以下を編集：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `NEXT_PUBLIC_LIFF_ID`

### 2. Supabase セットアップ

1. [Supabase](https://supabase.com) でプロジェクト作成
2. SQL Editor で `supabase/migrations/001_initial_schema.sql` を実行
3. 初期店舗データを INSERT

```sql
INSERT INTO stores (name, display_name, address) VALUES
  ('cookie-kmt-kumamoto', 'cookie-kmt 熊本', '熊本市中央区...');
```

### 3. LINE 設定

1. [LINE Developers](https://developers.line.biz/) で Messaging API チャネル作成
2. LIFF アプリを作成（チェックイン用）
3. Channel ID, Channel Access Token, LIFF ID を `.env.local` に記入

### 4. ローカル開発

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセス

---

## 🚀 Vercel デプロイ

GitHub へプッシュ後、Vercel で自動デプロイ：

```bash
git add .
git commit -m "Phase 0: Initial setup"
git push origin main
```

Vercel Settings で環境変数を設定してから本番テスト開始。

---

## 📅 実装ロードマップ

- [x] **Phase 0**: 基盤（Next.js + Supabase + TypeScript）
- [ ] **Phase 1**: MVP コア（管理画面基本機能・QR・LINE連携）
- [ ] **Phase 2**: 顧客フロー（カルテ・アンケート・サンキューLINE）
- [ ] **Phase 3**: スタッフフロー（施術ログ・音声入力・AI整形）
- [ ] **Phase 4**: 分析機能（ダッシュボード・売上・リピート）
- [ ] **Phase 5**: 仕上げ（リマインド自動配信・キャンペーン）

---

## 🔐 セキュリティ

- `OPENAI_API_KEY` は **絶対に GitHub にコミットしない**
- Vercel 環境変数で管理
- `.env.local` は `.gitignore` に含まれている

---

## 📞 サポート

実装中の質問は README を更新します。

---

**Version**: 0.1.0 (Phase 0)
**Status**: 開発中
**Last Updated**: 2026-04-07
