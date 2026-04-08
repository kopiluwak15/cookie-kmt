// ===== 顧客管理 ダミーデータ =====
// TODO: Supabase接続後に置き換え
//
// 北極星: 「悩み→施術→再来店」の再現性を可視化
// → 顧客一覧は「悩みカテゴリ」「再来店状態」で絞り込めることを重視

export type CustomerStatus = "new" | "active" | "at_risk" | "dormant";

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  new: "新規",
  active: "稼働中",
  at_risk: "離脱懸念",
  dormant: "休眠",
};

export const STATUS_COLOR: Record<CustomerStatus, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-green-50 text-green-700 border-green-200",
  at_risk: "bg-amber-50 text-amber-700 border-amber-200",
  dormant: "bg-gray-50 text-gray-600 border-gray-200",
};

export type AdminCustomer = {
  id: string;
  name: string;
  kana: string;
  phone?: string;
  email?: string;
  lineLinked: boolean;
  joinedAt: string;
  visitCount: number;
  lastVisit: string;
  totalSpend: number;
  status: CustomerStatus;
  concern: string; // 主な悩み
  isConcept: boolean; // コンセプト顧客か
  mainStaff: string;
  nextScheduled?: string;
};

export const ADMIN_CUSTOMERS: AdminCustomer[] = [
  {
    id: "C-000123",
    name: "山田 花子",
    kana: "ヤマダ ハナコ",
    phone: "090-1234-5678",
    email: "hanako@example.com",
    lineLinked: true,
    joinedAt: "2025-09-12",
    visitCount: 4,
    lastVisit: "2026-03-22",
    totalSpend: 79200,
    status: "active",
    concern: "うねり・広がり",
    isConcept: true,
    mainStaff: "黒田 真菜武",
    nextScheduled: "2026-05-20",
  },
  {
    id: "C-000087",
    name: "佐藤 由美",
    kana: "サトウ ユミ",
    phone: "090-2345-6789",
    lineLinked: true,
    joinedAt: "2024-11-03",
    visitCount: 5,
    lastVisit: "2026-04-08",
    totalSpend: 112000,
    status: "active",
    concern: "アイロン依存",
    isConcept: true,
    mainStaff: "黒田 真菜武",
  },
  {
    id: "C-000142",
    name: "田中 美咲",
    kana: "タナカ ミサキ",
    lineLinked: true,
    joinedAt: "2025-06-20",
    visitCount: 3,
    lastVisit: "2026-04-08",
    totalSpend: 66000,
    status: "active",
    concern: "ダメージ・パサつき",
    isConcept: true,
    mainStaff: "黒田 真菜武",
  },
  {
    id: "C-000098",
    name: "渡辺 真理子",
    kana: "ワタナベ マリコ",
    phone: "090-3456-7890",
    lineLinked: false,
    joinedAt: "2023-04-15",
    visitCount: 8,
    lastVisit: "2026-03-15",
    totalSpend: 142000,
    status: "active",
    concern: "メンテナンス",
    isConcept: false,
    mainStaff: "黒田 真菜武",
  },
  {
    id: "C-000201",
    name: "高橋 麻衣",
    kana: "タカハシ マイ",
    lineLinked: true,
    joinedAt: "2026-04-08",
    visitCount: 1,
    lastVisit: "2026-04-08",
    totalSpend: 18000,
    status: "new",
    concern: "うねり・広がり",
    isConcept: true,
    mainStaff: "黒田 真菜武",
  },
  {
    id: "C-000156",
    name: "鈴木 さくら",
    kana: "スズキ サクラ",
    phone: "090-4567-8901",
    email: "sakura@example.com",
    lineLinked: true,
    joinedAt: "2022-08-10",
    visitCount: 12,
    lastVisit: "2026-04-08",
    totalSpend: 168000,
    status: "active",
    concern: "白髪・カラー悩み",
    isConcept: false,
    mainStaff: "佐藤 美咲",
  },
  {
    id: "C-000178",
    name: "山本 結衣",
    kana: "ヤマモト ユイ",
    lineLinked: true,
    joinedAt: "2025-12-01",
    visitCount: 2,
    lastVisit: "2026-04-08",
    totalSpend: 38500,
    status: "active",
    concern: "ダメージ・パサつき",
    isConcept: true,
    mainStaff: "佐藤 美咲",
  },
  {
    id: "C-000223",
    name: "新規顧客A",
    kana: "シンキコキャク エー",
    lineLinked: false,
    joinedAt: "2026-04-06",
    visitCount: 1,
    lastVisit: "2026-04-06",
    totalSpend: 6500,
    status: "new",
    concern: "ボリューム調整",
    isConcept: false,
    mainStaff: "田中 翔太",
  },
  {
    id: "C-000089",
    name: "中村 恵子",
    kana: "ナカムラ ケイコ",
    phone: "090-5678-9012",
    lineLinked: true,
    joinedAt: "2024-02-14",
    visitCount: 6,
    lastVisit: "2026-01-25",
    totalSpend: 88000,
    status: "at_risk",
    concern: "アイロン依存",
    isConcept: true,
    mainStaff: "佐藤 美咲",
  },
  {
    id: "C-000045",
    name: "小林 直子",
    kana: "コバヤシ ナオコ",
    lineLinked: false,
    joinedAt: "2022-03-01",
    visitCount: 14,
    lastVisit: "2025-10-12",
    totalSpend: 215000,
    status: "dormant",
    concern: "メンテナンス",
    isConcept: false,
    mainStaff: "黒田 真菜武",
  },
];

export const CONCERN_CATEGORIES = [
  "すべて",
  "うねり・広がり",
  "ダメージ・パサつき",
  "アイロン依存",
  "ボリューム調整",
  "白髪・カラー悩み",
  "メンテナンス",
] as const;
