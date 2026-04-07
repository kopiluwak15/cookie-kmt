// ブランドカラー
export const COLORS = {
  bg: "#FAF8F5",
  card: "#FFFFFF",
  border: "#E8E4DE",
  text: "#2C2825",
  mid: "#7A746B",
  dim: "#B5AFA6",
  accent: "#9E7B5B",
  accentLight: "#F3EDE6",
  green: "#4A8C5E",
  greenBg: "#EFF7F1",
  red: "#C45B4A",
  redBg: "#FDF0EE",
};

// メニュータイプ
export const MENU_TYPES = {
  REGULAR: "regular",
  CONCEPT: "concept",
} as const;

// 施術ログのステータス
export const VISIT_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  COMPLETED: "completed",
} as const;

// スタッフレベル
export const STAFF_LEVELS = {
  JUNIOR: "junior",
  STYLIST: "stylist",
  TOP: "top",
} as const;

// インセンティブ計算
export const INCENTIVE = {
  CONCEPT_RATE: 0.05, // 5%
} as const;

// リマインド周期（日数）
export const REMINDER_CYCLES = {
  SHORT: 21, // 3週間
  MEDIUM: 42, // 6週間
  LONG: 90, // 3ヶ月
} as const;

// キャッシュ期間（ミリ秒）
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5分
  MEDIUM: 30 * 60 * 1000, // 30分
  LONG: 24 * 60 * 60 * 1000, // 24時間
} as const;
