// ===== 管理画面ダッシュボード ダミーデータ =====
// TODO: Supabase接続後に集計クエリで置き換え
//
// 設計原則（cookie-kmt 北極星より）:
// - 「悩み→施術→再来店」の再現性を可視化
// - スタッフの努力の方向性を見える化
// - 多様な動機（報酬/使命感/恐怖）に対応した複数の見え方

export type Period = "today" | "week" | "month" | "quarter";

export type NorthStarKpi = {
  // コンセプトメニュー売上構成比 (%)
  conceptRatio: number;
  conceptRatioTarget: number;
  conceptRatioDelta: number; // 前期比 ±%

  // 再来店率 (%)
  returnRate: number;
  returnRateTarget: number;
  returnRateDelta: number;

  // 判断ログ充足率 (%) — コンセプト施術のうち判断ログが記録された割合
  judgmentLogRate: number;
  judgmentLogRateTarget: number;
  judgmentLogRateDelta: number;

  // コンセプト顧客LTV (¥)
  conceptLtv: number;
  conceptLtvTarget: number;
  conceptLtvDelta: number;
};

export type Alert = {
  id: string;
  severity: "high" | "mid" | "low";
  title: string;
  detail: string;
  href?: string;
};

export type StaffPerformance = {
  staffId: string;
  name: string;
  // 報酬型: 売上・インセンティブ
  sales: number;
  incentive: number;
  // 使命感型: 解決した悩みの数
  resolvedConcerns: number;
  // 共通: コンセプト比率・判断ログ率
  conceptRatio: number;
  judgmentLogRate: number;
  returnRate: number;
};

export type ConcernResolved = {
  category: string; // 例: "うねり・広がり"
  count: number;
  successRate: number; // %
};

export type RecentActivity = {
  id: string;
  at: string; // ISO
  staff: string;
  customer: string;
  type: "visit" | "judgment" | "comment" | "treatment";
  summary: string;
};

// ===== ダミーデータ =====
export const NORTH_STAR: NorthStarKpi = {
  conceptRatio: 58,
  conceptRatioTarget: 60,
  conceptRatioDelta: +4,

  returnRate: 71,
  returnRateTarget: 75,
  returnRateDelta: +2,

  judgmentLogRate: 82,
  judgmentLogRateTarget: 90,
  judgmentLogRateDelta: -3,

  conceptLtv: 142000,
  conceptLtvTarget: 150000,
  conceptLtvDelta: +6,
};

export const ALERTS: Alert[] = [
  {
    id: "a1",
    severity: "high",
    title: "判断ログ充足率が目標を10%下回っています",
    detail:
      "過去7日間のコンセプト施術22件のうち、判断ログ未記録が4件あります。インセンティブ計算に反映されない可能性があります。",
    href: "/admin/judgments",
  },
  {
    id: "a2",
    severity: "mid",
    title: "新規→2回目来店率が下降傾向（先月比 -8%）",
    detail:
      "新規顧客15名のうち、4週間以内に再来店したのは6名。BBD LINE未送信の顧客がいる可能性があります。",
  },
  {
    id: "a3",
    severity: "low",
    title: "在庫アラート: ストレート1剤（マイルド）残量わずか",
    detail: "推定残量: 約1.5回分。発注をご検討ください。",
  },
];

export const STAFF_PERFORMANCE: StaffPerformance[] = [
  {
    staffId: "s1",
    name: "黒田 真菜武",
    sales: 1240000,
    incentive: 186000,
    resolvedConcerns: 38,
    conceptRatio: 72,
    judgmentLogRate: 95,
    returnRate: 84,
  },
  {
    staffId: "s2",
    name: "佐藤 美咲",
    sales: 980000,
    incentive: 132000,
    resolvedConcerns: 29,
    conceptRatio: 61,
    judgmentLogRate: 88,
    returnRate: 76,
  },
  {
    staffId: "s3",
    name: "田中 翔太",
    sales: 760000,
    incentive: 84000,
    resolvedConcerns: 18,
    conceptRatio: 42,
    judgmentLogRate: 65,
    returnRate: 62,
  },
];

export const CONCERNS_RESOLVED: ConcernResolved[] = [
  { category: "うねり・広がり",   count: 42, successRate: 88 },
  { category: "ダメージ・パサつき", count: 31, successRate: 81 },
  { category: "アイロン依存",      count: 24, successRate: 92 },
  { category: "ボリューム調整",    count: 18, successRate: 78 },
  { category: "白髪・カラー悩み",  count: 15, successRate: 73 },
];

// ===== ステージ（職階）マスタ =====
export type StageCode =
  | "A1" | "A2" | "S1" | "S2" | "SM" | "AM" | "FW" | "CA" | "SP";

export const STAGES: { code: StageCode; name: string; description?: string }[] = [
  { code: "A1", name: "アシスタント" },
  { code: "A2", name: "Jr.スタイリスト" },
  { code: "S1", name: "スタイリスト" },
  { code: "S2", name: "トップスタイリスト" },
  { code: "SM", name: "ストアマネージャー" },
  { code: "AM", name: "マネージャー" },
  { code: "FW", name: "時短社員" },
  { code: "CA", name: "アルバイト・パート" },
  { code: "SP", name: "業務委託" },
];

// ===== 店舗マスタ =====
export const STORES: { id: string; name: string }[] = [
  { id: "kmt", name: "COOKIE 熊本" },
  // 将来増えたらここに追加
];

// ===== 権限 =====
export type Permission = "admin" | "staff";
export const PERMISSIONS: { id: Permission; label: string }[] = [
  { id: "admin", label: "管理者" },
  { id: "staff", label: "スタッフ" },
];

// ===== スタッフ詳細用 =====
export type StaffDetail = {
  staffId: string;
  name: string;
  role: string;
  joinedAt: string;
  avatar?: string;

  // 月次推移（直近6ヶ月）
  monthly: {
    month: string; // "2025-11"
    sales: number;
    incentive: number;
    conceptRatio: number;
    returnRate: number;
  }[];

  // カテゴリ別の解決数
  concernsResolved: ConcernResolved[];

  // 強み・課題
  strengths: string[];
  challenges: string[];

  // 担当顧客（指名）
  customers: {
    id: string;
    name: string;
    visitCount: number;
    lastVisit: string;
    isConcept: boolean;
  }[];

  // 最近の判断ログ
  recentJudgments: {
    id: string;
    at: string;
    customer: string;
    menu: string;
    note: string;
  }[];
};

export const STAFF_DETAILS: Record<string, StaffDetail> = {
  s1: {
    staffId: "s1",
    name: "黒田 真菜武",
    role: "代表 / トップスタイリスト",
    joinedAt: "2018-04-01",
    monthly: [
      { month: "2025-11", sales: 980000,  incentive: 142000, conceptRatio: 65, returnRate: 79 },
      { month: "2025-12", sales: 1150000, incentive: 168000, conceptRatio: 68, returnRate: 81 },
      { month: "2026-01", sales: 1080000, incentive: 156000, conceptRatio: 70, returnRate: 80 },
      { month: "2026-02", sales: 1180000, incentive: 172000, conceptRatio: 71, returnRate: 82 },
      { month: "2026-03", sales: 1240000, incentive: 186000, conceptRatio: 72, returnRate: 84 },
      { month: "2026-04", sales: 420000,  incentive: 62000,  conceptRatio: 73, returnRate: 84 },
    ],
    concernsResolved: [
      { category: "うねり・広がり",     count: 18, successRate: 94 },
      { category: "アイロン依存",       count: 12, successRate: 92 },
      { category: "ダメージ・パサつき", count: 10, successRate: 85 },
      { category: "ボリューム調整",     count: 6,  successRate: 83 },
    ],
    strengths: [
      "コンセプト矯正の成功率が店舗平均より +12%",
      "判断ログの記入率95%（店舗トップ）",
      "再来店率84%（目標+9%）",
    ],
    challenges: [
      "新規来店枠の余裕が少なく、紹介を受けきれていない可能性",
    ],
    customers: [
      { id: "C-000123", name: "山田 花子",   visitCount: 4, lastVisit: "2026-03-22", isConcept: true  },
      { id: "C-000087", name: "佐藤 由美",   visitCount: 5, lastVisit: "2026-04-08", isConcept: true  },
      { id: "C-000142", name: "田中 美咲",   visitCount: 3, lastVisit: "2026-04-08", isConcept: true  },
      { id: "C-000098", name: "渡辺 真理子", visitCount: 8, lastVisit: "2026-03-15", isConcept: false },
      { id: "C-000201", name: "高橋 麻衣",   visitCount: 1, lastVisit: "2026-04-08", isConcept: true  },
    ],
    recentJudgments: [
      {
        id: "j1",
        at: "2026-04-08T14:32:00+09:00",
        customer: "山田 花子",
        menu: "コンセプト矯正",
        note: "ダメージ高めのため1剤マイルド・放置時間短縮で対応。前回比で毛先の艶アップ。",
      },
      {
        id: "j2",
        at: "2026-04-07T16:00:00+09:00",
        customer: "佐藤 由美",
        menu: "髪質改善ストレート",
        note: "根元のクセ強めで2剤しっかり目。乾かしのみで再現できる仕上がり。",
      },
      {
        id: "j3",
        at: "2026-04-05T11:30:00+09:00",
        customer: "渡辺 真理子",
        menu: "メンテナンスケア",
        note: "前回の状態キープを優先。次回は髪質改善のタイミング。",
      },
    ],
  },
  s2: {
    staffId: "s2",
    name: "佐藤 美咲",
    role: "スタイリスト",
    joinedAt: "2022-04-01",
    monthly: [
      { month: "2025-11", sales: 720000, incentive: 96000,  conceptRatio: 52, returnRate: 70 },
      { month: "2025-12", sales: 820000, incentive: 110000, conceptRatio: 55, returnRate: 72 },
      { month: "2026-01", sales: 850000, incentive: 114000, conceptRatio: 57, returnRate: 74 },
      { month: "2026-02", sales: 900000, incentive: 122000, conceptRatio: 59, returnRate: 75 },
      { month: "2026-03", sales: 980000, incentive: 132000, conceptRatio: 61, returnRate: 76 },
      { month: "2026-04", sales: 320000, incentive: 44000,  conceptRatio: 63, returnRate: 77 },
    ],
    concernsResolved: [
      { category: "ダメージ・パサつき", count: 14, successRate: 82 },
      { category: "うねり・広がり",     count: 9,  successRate: 78 },
      { category: "白髪・カラー悩み",   count: 6,  successRate: 88 },
    ],
    strengths: ["コンセプト比率が6ヶ月連続で上昇", "カラー系の満足度が高い"],
    challenges: ["判断ログ記入率88%（目標まで-2%）", "うねり系の成功率にばらつき"],
    customers: [
      { id: "C-000156", name: "鈴木 さくら", visitCount: 12, lastVisit: "2026-04-08", isConcept: false },
      { id: "C-000178", name: "山本 結衣",   visitCount: 2,  lastVisit: "2026-04-08", isConcept: true  },
    ],
    recentJudgments: [
      {
        id: "j4",
        at: "2026-04-08T13:15:00+09:00",
        customer: "鈴木 さくら",
        menu: "リタッチカラー",
        note: "退色気にされていたので保護トリートメント追加。",
      },
    ],
  },
  s3: {
    staffId: "s3",
    name: "田中 翔太",
    role: "アシスタント / ジュニアスタイリスト",
    joinedAt: "2024-04-01",
    monthly: [
      { month: "2025-11", sales: 480000, incentive: 52000, conceptRatio: 32, returnRate: 56 },
      { month: "2025-12", sales: 540000, incentive: 60000, conceptRatio: 35, returnRate: 58 },
      { month: "2026-01", sales: 620000, incentive: 68000, conceptRatio: 38, returnRate: 60 },
      { month: "2026-02", sales: 680000, incentive: 74000, conceptRatio: 40, returnRate: 61 },
      { month: "2026-03", sales: 760000, incentive: 84000, conceptRatio: 42, returnRate: 62 },
      { month: "2026-04", sales: 220000, incentive: 24000, conceptRatio: 44, returnRate: 63 },
    ],
    concernsResolved: [
      { category: "ボリューム調整",     count: 7, successRate: 71 },
      { category: "ダメージ・パサつき", count: 5, successRate: 68 },
    ],
    strengths: ["売上は6ヶ月連続で上昇傾向", "新規顧客の対応が多い"],
    challenges: [
      "判断ログ記入率65%（目標まで-25%）",
      "コンセプトメニューの提案率が低い",
      "再来店率62%（目標まで-13%）",
    ],
    customers: [
      { id: "C-000223", name: "新規顧客A", visitCount: 1, lastVisit: "2026-04-06", isConcept: false },
      { id: "C-000219", name: "新規顧客B", visitCount: 1, lastVisit: "2026-04-04", isConcept: false },
    ],
    recentJudgments: [],
  },
};

export function findStaff(id: string) {
  return STAFF_DETAILS[id];
}

export const RECENT_ACTIVITIES: RecentActivity[] = [
  {
    id: "act1",
    at: "2026-04-08T14:32:00+09:00",
    staff: "黒田",
    customer: "山田 花子",
    type: "judgment",
    summary: "判断ログ記録: コンセプト矯正（うねり・広がり / 高ダメージ）",
  },
  {
    id: "act2",
    at: "2026-04-08T13:15:00+09:00",
    staff: "佐藤",
    customer: "鈴木 さくら",
    type: "comment",
    summary: "マイページへスタッフコメント投稿（次回提案つき）",
  },
  {
    id: "act3",
    at: "2026-04-08T11:20:00+09:00",
    staff: "黒田",
    customer: "田中 美咲",
    type: "visit",
    summary: "コンセプト矯正＋C&T 完了 ¥22,000",
  },
  {
    id: "act4",
    at: "2026-04-08T10:05:00+09:00",
    staff: "田中",
    customer: "高橋 麻衣",
    type: "treatment",
    summary: "メニュー: リタッチカラー（判断ログ未記録）",
  },
];
