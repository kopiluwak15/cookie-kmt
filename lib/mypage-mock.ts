// ===== マイページ用ダミーデータ =====
// TODO: LIFF認証 + Supabase接続後に置き換え

export type StaffComment = {
  staffName: string;
  postedAt: string; // ISO
  body: string;
};

export type VisitHistory = {
  id: string;
  date: string;        // YYYY-MM-DD
  menus: string[];
  totalPrice: number;
  staffName: string;
  isConcept: boolean;
  // 施術メモ（お客様に見せる用 = カルテの「申し送り」を整形したもの）
  summary: string;
  // スタッフからのコメント（複数可）
  staffComments: StaffComment[];
  // 次回提案
  nextSuggestion?: {
    menu: string;
    timing: string; // 例: "1〜2ヶ月後"
    reason: string;
  };
};

export type MyPageUser = {
  lineId: string;
  displayName: string;
  pictureUrl?: string;
  customerNo: string;
  joinedAt: string; // YYYY-MM-DD
  visitCount: number;
  nextRecommendDate?: string; // YYYY-MM-DD
};

export const MOCK_USER: MyPageUser = {
  lineId: "U1234567890abcdef",
  displayName: "山田 花子",
  customerNo: "C-000123",
  joinedAt: "2025-09-12",
  visitCount: 4,
  nextRecommendDate: "2026-05-20",
};

export const MOCK_HISTORY: VisitHistory[] = [
  {
    id: "v-004",
    date: "2026-03-22",
    menus: ["髪質改善ストレート", "プレミアムトリートメント"],
    totalPrice: 19800,
    staffName: "黒田",
    isConcept: true,
    summary:
      "前回より広がりが落ち着き、根元のクセも素直になってきました。乾かすだけでまとまる状態です。",
    staffComments: [
      {
        staffName: "黒田",
        postedAt: "2026-03-22T18:30:00+09:00",
        body:
          "本日もありがとうございました。前回からの積み重ねで毛先のダメージがかなり軽減しています。家での乾かし方は、根元から前に流すように乾かすと再現しやすいです。",
      },
      {
        staffName: "黒田",
        postedAt: "2026-03-25T10:00:00+09:00",
        body:
          "施術後3日経ちましたがいかがですか？湿気の強い日があってもまとまりが続くはずです。気になる点があればいつでもLINEでご連絡ください。",
      },
    ],
    nextSuggestion: {
      menu: "髪質改善メンテナンス",
      timing: "1.5〜2ヶ月後",
      reason: "現在の良い状態を維持するため、根元のクセが伸びる前のメンテがおすすめです。",
    },
  },
  {
    id: "v-003",
    date: "2026-01-18",
    menus: ["縮毛矯正", "カット"],
    totalPrice: 22000,
    staffName: "黒田",
    isConcept: true,
    summary:
      "全体に縮毛矯正をかけ、顔まわりは自然な丸みを残しました。アイロンを使わずまとまる仕上がりに。",
    staffComments: [
      {
        staffName: "黒田",
        postedAt: "2026-01-18T19:00:00+09:00",
        body:
          "クセが強めだったので薬剤をマイルドに調整しました。柔らかい質感に仕上がっています。",
      },
    ],
    nextSuggestion: {
      menu: "髪質改善ストレート",
      timing: "2ヶ月後",
      reason: "矯正の持ちを高めるため、間に髪質改善を挟むと毛先まで艶が出ます。",
    },
  },
  {
    id: "v-002",
    date: "2025-11-05",
    menus: ["カット", "トリートメント"],
    totalPrice: 9800,
    staffName: "黒田",
    isConcept: false,
    summary: "毛先を2cmカット、トリートメントで質感調整しました。",
    staffComments: [
      {
        staffName: "黒田",
        postedAt: "2025-11-05T17:30:00+09:00",
        body: "次回は髪質改善メニューもご検討ください。クセが気になる範囲が広がってきています。",
      },
    ],
  },
  {
    id: "v-001",
    date: "2025-09-12",
    menus: ["カット", "カラー"],
    totalPrice: 12100,
    staffName: "黒田",
    isConcept: false,
    summary: "ご新規来店。カット＋ナチュラルブラウンのカラー。",
    staffComments: [
      {
        staffName: "黒田",
        postedAt: "2025-09-12T18:00:00+09:00",
        body:
          "ご来店ありがとうございました！クセでお悩みとのことだったので、次回ぜひ髪質改善の体験をおすすめします。",
      },
    ],
  },
];

export function findVisit(id: string) {
  return MOCK_HISTORY.find((v) => v.id === id);
}
