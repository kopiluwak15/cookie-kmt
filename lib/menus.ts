// メニューマスタ（後日 Supabase 化、管理画面から編集可能にする）
// concept フラグは店舗との打ち合わせ後に確定する。現在は仮置き。

export type Menu = {
  id: number;
  name: string;
  price: number;
  category: MenuCategory;
  concept: boolean;
};

export type MenuCategory =
  | "cut"
  | "color"
  | "perm"
  | "straight"
  | "treatment"
  | "spa"
  | "set"
  | "option";

export const CATEGORY_LABEL: Record<MenuCategory, string> = {
  cut: "カット",
  color: "カラー",
  perm: "パーマ",
  straight: "矯正",
  treatment: "TR",
  spa: "スパ",
  set: "セット",
  option: "オプション",
};

export const MENUS: Menu[] = [
  // === カット ===
  { id: 1,  name: "カット(一般)",        price: 4500, category: "cut", concept: false },
  { id: 2,  name: "MEN's CUT",           price: 4000, category: "cut", concept: false },
  { id: 3,  name: "カット(大学生)",      price: 3500, category: "cut", concept: false },
  { id: 4,  name: "カット(Under-18)",    price: 3500, category: "cut", concept: false },
  { id: 5,  name: "カット(Under-12)",    price: 2500, category: "cut", concept: false },

  // === カラー ===
  { id: 10, name: "ジュエルカラー",       price: 5500,  category: "color", concept: false },
  { id: 11, name: "men'sカラー",         price: 5500,  category: "color", concept: false },
  { id: 12, name: "モイスチャーカラー",   price: 13500, category: "color", concept: true  },
  { id: 13, name: "ブラックカラー",       price: 3000,  category: "color", concept: false },
  { id: 14, name: "ブリーチ",            price: 4500,  category: "color", concept: false },
  { id: 15, name: "ヘアマニキュア",       price: 5500,  category: "color", concept: false },

  // === パーマ ===
  { id: 20, name: "ラグジュアリーパーマ",     price: 5500, category: "perm", concept: false },
  { id: 21, name: "men'sパーマ",            price: 5500, category: "perm", concept: false },
  { id: 22, name: "酵素クレンジングパーマ",   price: 6500, category: "perm", concept: false },

  // === 矯正・ストレート ===
  { id: 30, name: "ストレート",            price: 6000,  category: "straight", concept: true },
  { id: 31, name: "縮毛矯正",              price: 8000,  category: "straight", concept: true },
  { id: 32, name: "men's縮毛矯正",         price: 8000,  category: "straight", concept: true },
  { id: 33, name: "前髪ストレート",         price: 3000,  category: "straight", concept: true },
  { id: 34, name: "部分ストレート",         price: 4000,  category: "straight", concept: true },
  { id: 35, name: "モイスチャーストレート", price: 18000, category: "straight", concept: true },

  // === トリートメント ===
  { id: 40, name: "ジュエルトリートメント 2Step", price: 1500, category: "treatment", concept: false },
  { id: 41, name: "アローブトリートメント 4Step", price: 4000, category: "treatment", concept: true  },
  { id: 42, name: "モイスチャートリートメント",    price: 8000, category: "treatment", concept: true  },

  // === ヘッドスパ ===
  { id: 50, name: "クイックスパ",         price: 1000, category: "spa", concept: false },
  { id: 51, name: "極上30分ヘッドスパ",    price: 3000, category: "spa", concept: false },
  { id: 52, name: "アローブ30分スパ",      price: 4000, category: "spa", concept: true  },
  { id: 53, name: "超極上50分ヘッドスパ",  price: 5000, category: "spa", concept: false },
  { id: 54, name: "アローブ50分スパ",      price: 6000, category: "spa", concept: true  },

  // === セット ===
  { id: 60, name: "ヘアセット",            price: 4000, category: "set", concept: false },
  { id: 61, name: "メンズヘアセット",       price: 2000, category: "set", concept: false },
  { id: 62, name: "メイクA",              price: 2000, category: "set", concept: false },

  // === オプション・付帯 ===
  { id: 70, name: "前髪カット",            price: 1000, category: "option", concept: false },
  { id: 71, name: "ショート料金",          price: 500,  category: "option", concept: false },
  { id: 72, name: "ミディアム料金",        price: 1000, category: "option", concept: false },
  { id: 73, name: "ロング料金",            price: 1500, category: "option", concept: false },
  { id: 74, name: "シャンプー",           price: 1000, category: "option", concept: false },
];

export const isConceptMenu = (id: number) =>
  MENUS.find((m) => m.id === id)?.concept ?? false;
