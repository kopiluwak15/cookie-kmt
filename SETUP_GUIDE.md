# cookie-kmt セットアップガイド

## 概要
このガイドは、cookie-kmt LINE CRM システムを本番環境で実行するためのセットアップ手順です。

## 前提条件
- GitHub に `cookie-kmt` リポジトリが作成済み
- Vercel にプロジェクトが接続済み
- Supabase プロジェクトが作成済み
- Vercel の環境変数が設定済み（以下）:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `NEXT_PUBLIC_LIFF_ID`
  - `LINE_CHANNEL_ID`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_CHANNEL_SECRET`

---

## ステップ 1: Supabase スキーマの実行

### 1.1 Supabase ダッシュボードにアクセス
1. [Supabase](https://supabase.com) にログイン
2. 対象プロジェクトを選択

### 1.2 SQL ファイルを実行
1. 左サイドバーから **SQL Editor** をクリック
2. 新しいクエリを作成
3. `/supabase/migrations/001_initial_schema.sql` のコンテンツをコピー
4. SQL エディタに貼り付け
5. **Run** ボタンをクリック

✅ **確認**: 以下のテーブルが作成されたことを確認します:
- `stores` - 店舗マスタ
- `staff` - スタッフ情報
- `customers` - 顧客情報
- `menus` - メニュー
- `styles` - スタイル（リマインド周期）
- `visits` - 来店記録
- `concept_questionnaires` - 悩みアンケート
- `concept_treatment_logs` - 施術詳細ログ
- `tickets` - チケット
- `incentive_settings` - インセンティブ設定
- `incentive_records` - インセンティブ履歴
- `reminders` - リマインド
- `line_messages` - LINE メッセージログ
- `campaigns` - キャンペーン
- `questionnaire_templates` - アンケートテンプレート
- `settings` - 店舗設定

---

## ステップ 2: 初期データの挿入

### オプション A: API を使用した初期化（推奨）

デプロイ済みのアプリから初期化 API を呼び出します:

```bash
curl -X POST https://kmt.cookie.hair/api/init/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <INIT_SECRET>"
```

**注**: 本番環境では `INIT_SECRET` 環境変数を設定してください。

### オプション B: SQL で直接挿入

Supabase SQL Editor で以下を実行:

```sql
INSERT INTO stores (name, display_name, address) VALUES
  ('cookie-kmt-kumamoto', 'cookie-kmt 熊本', '熊本市中央区');

INSERT INTO styles (store_id, name, reminder_days)
SELECT id, '基本', 42 FROM stores WHERE name = 'cookie-kmt-kumamoto';

INSERT INTO menus (store_id, name, display_name, price, menu_type, duration_minutes)
SELECT id, 'regular_straight', '縮毛矯正', 12000, 'regular', 120 FROM stores WHERE name = 'cookie-kmt-kumamoto'
UNION ALL
SELECT id, 'concept_straight', 'コンセプト縮毛矯正', 15000, 'concept', 150 FROM stores WHERE name = 'cookie-kmt-kumamoto';
```

✅ **確認**:
- `stores` テーブルに `cookie-kmt 熊本` が存在
- `styles` テーブルに基本スタイルが存在
- `menus` テーブルにメニューが存在

---

## ステップ 3: LINE LIFF 設定

### 3.1 LINE Developers でチャネル作成
1. [LINE Developers](https://developers.line.biz/) にログイン
2. 新しいプロバイダー＆チャネルを作成
3. **Messaging API** チャネルタイプを選択

### 3.2 LIFF アプリ作成
1. 左サイドバーから **LIFF** をクリック
2. **新規作成** をクリック
3. 以下を設定:
   - **Endpoint URL**: `https://kmt.cookie.hair/customer/checkin`
   - **Size**: **Full**
   - **Permissions**: `profile`, `openid`, `email`

### 3.3 環境変数にコピー
生成された **LIFF ID** を Vercel の環境変数 `NEXT_PUBLIC_LIFF_ID` に設定

---

## ステップ 4: 動作確認

### 4.1 ランディングページ確認
```
https://kmt.cookie.hair/
```

以下が表示されることを確認:
- ✅ タイトル: "cookie-kmt"
- ✅ 3つのボタン:
  - チェックイン（QR読込）
  - スタッフログイン
  - 管理画面

### 4.2 API ヘルスチェック
```bash
curl https://kmt.cookie.hair/api/health
```

---

## トラブルシューティング

### 問題: Supabase 接続エラー
- ✅ 確認: `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しく設定されているか
- ✅ 確認: Supabase プロジェクトの RLS（Row Level Security）設定

### 問題: テーブル作成エラー
- 原因: スキーマ SQL が完全に実行されていない
- 解決: SQL Editor で一行ずつ実行を試みる

### 問題: 初期化 API が 404 返す
- 原因: デプロイが完了していない
- 確認: Vercel デプロイメントのステータスが **Ready** であることを確認

---

## 次のステップ

✅ セットアップ完了後、以下の機能の開発に進みます:

1. **QR コード生成** - 3 種類の QR コード（チェックイン、LINE 不所持、スタッフログイン）
2. **LINE LIFF チェックイン** - 顧客のQRスキャンからアンケート入力まで
3. **スタッフダッシュボード** - 施術ログ入力、来客管理、インセンティブ確認
4. **管理画面** - ダッシュボード、売上分析、顧客管理、メニュー・スタイル管理

---

## サポート

問題が発生した場合は、以下をご確認ください:
1. Vercel デプロイメントログ
2. Supabase 監視タブ
3. ブラウザコンソール（F12 > Console）
