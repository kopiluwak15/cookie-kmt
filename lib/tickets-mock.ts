// ===== チケット ダミーデータ =====
// TODO: Supabase接続後に tickets テーブルへ置き換え
//
// 設計: パターンB（1枚1権利方式）
// - 施術完了時にスタッフが発行
// - BBD LINEで配布、マイページに表示
// - お客様がCheck-inでタップ → 仮押さえ
// - スタッフが施術ログ確定で実消化

export type TicketStatus = "unused" | "held" | "used" | "expired";

export type TicketTypeDef = {
  type: string;
  title: string;
  description: string;
  discountAmount?: number;
  discountRate?: number;
  validMonths: number;
  defaultIssueAfter: string[]; // どの施術後に発行候補とするか
};

// スタッフ発行画面で選べるチケットのテンプレート
export const TICKET_TEMPLATES: TicketTypeDef[] = [
  {
    type: "maintenance_50",
    title: "髪質改善メンテナンス 50%OFF",
    description: "次回のメンテナンス施術が半額になります",
    discountRate: 50,
    validMonths: 2,
    defaultIssueAfter: ["髪質改善ストレート", "コンセプト矯正"],
  },
  {
    type: "treatment_free",
    title: "プレミアムトリートメント無料",
    description: "次回ご来店時、トリートメントを無料でお付けします",
    discountAmount: 5500,
    validMonths: 3,
    defaultIssueAfter: ["髪質改善ストレート", "縮毛矯正", "コンセプト矯正"],
  },
  {
    type: "ct_2000off",
    title: "C&T施術 ¥2,000 OFF",
    description: "カット＋トリートメント施術が2,000円引き",
    discountAmount: 2000,
    validMonths: 2,
    defaultIssueAfter: ["カット", "縮毛矯正"],
  },
  {
    type: "first_intro_1000",
    title: "ご紹介ありがとうクーポン ¥1,000 OFF",
    description: "次回のお会計から1,000円引き",
    discountAmount: 1000,
    validMonths: 6,
    defaultIssueAfter: [],
  },
];

export type Ticket = {
  id: string;
  customerId: string;
  type: string;
  title: string;
  description: string;
  discountAmount?: number;
  discountRate?: number;
  issuedAt: string;     // ISO
  issuedBy: string;     // staff name
  expiresAt: string;    // ISO
  status: TicketStatus;
  usedAt?: string;
  heldAt?: string;      // 仮押さえ時刻
};

// MOCK_USER（マイページ）の顧客に紐づくチケット
export const MOCK_TICKETS: Ticket[] = [
  {
    id: "t-001",
    customerId: "C-000123",
    type: "maintenance_50",
    title: "髪質改善メンテナンス 50%OFF",
    description: "次回のメンテナンス施術が半額になります",
    discountRate: 50,
    issuedAt: "2026-03-22T18:30:00+09:00",
    issuedBy: "黒田",
    expiresAt: "2026-05-22T23:59:59+09:00",
    status: "unused",
  },
  {
    id: "t-002",
    customerId: "C-000123",
    type: "treatment_free",
    title: "プレミアムトリートメント無料",
    description: "次回ご来店時、トリートメントを無料でお付けします",
    discountAmount: 5500,
    issuedAt: "2026-03-22T18:30:00+09:00",
    issuedBy: "黒田",
    expiresAt: "2026-06-22T23:59:59+09:00",
    status: "unused",
  },
  {
    id: "t-003",
    customerId: "C-000123",
    type: "ct_2000off",
    title: "C&T施術 ¥2,000 OFF",
    description: "カット＋トリートメント施術が2,000円引き",
    discountAmount: 2000,
    issuedAt: "2026-01-18T19:00:00+09:00",
    issuedBy: "黒田",
    expiresAt: "2026-03-18T23:59:59+09:00",
    status: "expired",
  },
];

// ===== ヘルパー =====
export function getActiveTickets(customerId: string): Ticket[] {
  const now = new Date();
  return MOCK_TICKETS.filter(
    (t) =>
      t.customerId === customerId &&
      (t.status === "unused" || t.status === "held") &&
      new Date(t.expiresAt) > now,
  );
}

export function getExpiredOrUsedTickets(customerId: string): Ticket[] {
  return MOCK_TICKETS.filter(
    (t) =>
      t.customerId === customerId &&
      (t.status === "used" || t.status === "expired"),
  );
}

export function formatDiscountLabel(t: Ticket): string {
  if (t.discountRate) return `${t.discountRate}% OFF`;
  if (t.discountAmount) return `¥${t.discountAmount.toLocaleString()} OFF`;
  return "特典";
}

export function daysUntilExpiry(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
