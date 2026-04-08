// ===== スタッフ画面用 ダミーデータ =====

export const ME = {
  id: "s1",
  name: "黒田 真菜武",
  role: "代表 / トップスタイリスト",
  joinedAt: "2018-04-01",
  email: "kuroda@cookie.hair",
  phone: "090-0000-0000",
};

// ===== 本日の施術ログ =====
export type TodayCheckin = {
  id: string;
  customerId: string;
  name: string;
  visitCount: number;
  isConcept: boolean;
  checkedInAt: string; // HH:MM
  appointmentAt: string;
  menuPlanned: string;
  ticketsHeld: number; // 仮押さえ中チケット数
};

export type TodayLog = {
  id: string;
  customerId: string;
  name: string;
  visitCount: number;
  isConcept: boolean;
  startedAt: string;
  finishedAt: string;
  menus: string[];
  total: number;
  hasJudgmentLog: boolean;
  ticketsUsed: number;
};

export type TodayUpcoming = {
  id: string;
  customerId: string;
  name: string;
  visitCount: number;
  appointmentAt: string;
  menuPlanned: string;
  isConcept: boolean;
};

export const TODAY_CHECKINS: TodayCheckin[] = [
  {
    id: "ci1",
    customerId: "C-000087",
    name: "佐藤 由美",
    visitCount: 5,
    isConcept: true,
    checkedInAt: "10:02",
    appointmentAt: "10:00",
    menuPlanned: "コンセプト矯正＋C&T",
    ticketsHeld: 0,
  },
  {
    id: "ci2",
    customerId: "C-000142",
    name: "田中 美咲",
    visitCount: 3,
    isConcept: true,
    checkedInAt: "11:28",
    appointmentAt: "11:30",
    menuPlanned: "髪質改善トリートメント",
    ticketsHeld: 1,
  },
];

export const TODAY_LOGS: TodayLog[] = [
  {
    id: "log1",
    customerId: "C-000098",
    name: "渡辺 真理子",
    visitCount: 8,
    isConcept: false,
    startedAt: "08:30",
    finishedAt: "09:45",
    menus: ["カット", "リタッチカラー"],
    total: 9800,
    hasJudgmentLog: false,
    ticketsUsed: 0,
  },
];

export const TODAY_UPCOMING: TodayUpcoming[] = [
  {
    id: "up1",
    customerId: "C-000123",
    name: "山田 花子",
    visitCount: 4,
    appointmentAt: "13:00",
    menuPlanned: "髪質改善ストレート",
    isConcept: true,
  },
  {
    id: "up2",
    customerId: "C-000201",
    name: "高橋 麻衣",
    visitCount: 1,
    appointmentAt: "14:30",
    menuPlanned: "コンセプト矯正（初回）",
    isConcept: true,
  },
  {
    id: "up3",
    customerId: "C-000178",
    name: "山本 結衣",
    visitCount: 2,
    appointmentAt: "17:30",
    menuPlanned: "コンセプト矯正＋C&T",
    isConcept: true,
  },
];

export const TODAY_SUMMARY = {
  sales: 9800,
  doneCount: 1,
  inProgressCount: 0,
  waitingCount: 2,
  upcomingCount: 3,
  totalScheduled: 6,
  conceptCount: 5,
};

// ===== マイ実績用（期間集計のダミー生成器） =====
export type DailyStat = {
  date: string; // YYYY-MM-DD
  sales: number;
  customers: number;
  conceptCount: number;
  judgmentLogCount: number;
};

// 簡易ダミー: 直近60日分を生成
export function generateMyDaily(days = 60): DailyStat[] {
  const out: DailyStat[] = [];
  const today = new Date("2026-04-08");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const isOff = dow === 1; // 月休
    const ymd = d.toISOString().slice(0, 10);
    if (isOff) {
      out.push({ date: ymd, sales: 0, customers: 0, conceptCount: 0, judgmentLogCount: 0 });
      continue;
    }
    // 6〜10名 / 1日, 売上18万〜45万
    const customers = 6 + Math.floor((Math.sin(i * 0.7) + 1) * 2);
    const sales = customers * (18000 + Math.floor(Math.random() * 12000));
    const conceptCount = Math.max(2, Math.floor(customers * 0.6));
    const judgmentLogCount = Math.max(2, Math.floor(conceptCount * 0.95));
    out.push({ date: ymd, sales, customers, conceptCount, judgmentLogCount });
  }
  return out;
}

export function aggregate(daily: DailyStat[], from: string, to: string) {
  const filtered = daily.filter((d) => d.date >= from && d.date <= to);
  return {
    days: filtered.length,
    sales: filtered.reduce((s, d) => s + d.sales, 0),
    customers: filtered.reduce((s, d) => s + d.customers, 0),
    conceptCount: filtered.reduce((s, d) => s + d.conceptCount, 0),
    judgmentLogCount: filtered.reduce((s, d) => s + d.judgmentLogCount, 0),
    points: filtered,
  };
}

// ===== 店舗実績用 =====
export const STORE_STAFF = [
  { id: "s1", name: "黒田 真菜武", sales: 1240000, customers: 78, conceptRatio: 72, returnRate: 84 },
  { id: "s2", name: "佐藤 美咲",   sales: 980000,  customers: 64, conceptRatio: 61, returnRate: 76 },
  { id: "s3", name: "田中 翔太",   sales: 760000,  customers: 52, conceptRatio: 42, returnRate: 62 },
];

export const STORE_KPI = {
  sales: 2980000,
  salesTarget: 3200000,
  customers: 194,
  customersTarget: 200,
  newCustomers: 28,
  newCustomersTarget: 30,
  conceptRatio: 58,
  conceptRatioTarget: 60,
  returnRate: 71,
  returnRateTarget: 75,
};
