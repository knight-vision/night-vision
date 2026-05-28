// 都市設定ファイル
// 新都市追加時はここに追加するだけ

export type CityConfig = {
  key: string;           // URLスラッグ（例: kushiro, sapporo）
  name: string;          // 表示名（例: 釧路）
  prefecture: string;    // 都道府県
  description: string;   // SEO用説明
  areas: AreaConfig[];   // エリア一覧
  genres: GenreConfig[]; // 対応業種
};

export type AreaConfig = {
  key: string;   // URLスラッグ（例: suehiro）
  name: string;  // 表示名（例: 末広）
  description: string;
};

export type GenreConfig = {
  key: string;     // URLスラッグ（例: lounge）
  name: string;    // 表示名（例: ラウンジ）
  dbType: string;  // DBのtypeカラムの値
  englishLabel: string;
};

export const GENRES: GenreConfig[] = [
  { key: "lounge",      name: "ラウンジ/ニュークラ", dbType: "ラウンジ",       englishLabel: "LOUNGE/NEW CLUB" },
  { key: "girls-bar",   name: "ガールズバー",         dbType: "ガールズバー",   englishLabel: "GIRLS BAR" },
  { key: "snack",       name: "スナック",             dbType: "スナック",       englishLabel: "SNACK" },
  { key: "casual-bar",  name: "カジュアルバー",       dbType: "カジュアルバー", englishLabel: "CASUAL BAR" },
];

export const CITIES: CityConfig[] = [
  {
    key: "kushiro",
    name: "釧路",
    prefecture: "北海道",
    description: "北海道釧路市の夜遊びスポット情報。ラウンジ・ガールズバー・スナック・キャバクラを地域密着で紹介。",
    areas: [
      { key: "suehiro", name: "末広",  description: "釧路最大の繁華街。ラウンジ・スナック・ガールズバーが集中。" },
      { key: "aikoku",  name: "愛国",  description: "釧路市愛国エリア。地元密着の飲み屋が多い落ち着いたエリア。" },
      { key: "other",   name: "その他", description: "釧路市内その他のエリア。" },
    ],
    genres: GENRES,
  },
  // 今後追加予定
  // {
  //   key: "sapporo",
  //   name: "札幌",
  //   prefecture: "北海道",
  //   description: "札幌の夜遊びスポット情報。",
  //   areas: [
  //     { key: "susukino", name: "すすきの", description: "北海道最大の歓楽街。" },
  //   ],
  //   genres: GENRES,
  // },
];

export function getCity(key: string): CityConfig | undefined {
  return CITIES.find(c => c.key === key);
}

export function getArea(city: CityConfig, areaKey: string): AreaConfig | undefined {
  return city.areas.find(a => a.key === areaKey);
}

export function getGenre(key: string): GenreConfig | undefined {
  return GENRES.find(g => g.key === key);
}

// DBのarea_categoryからエリアキーに変換
export function areaNameToKey(name: string): string {
  const map: Record<string, string> = { 末広: "suehiro", 愛国: "aikoku", その他: "other" };
  return map[name] || "other";
}

export function areaKeyToName(key: string): string {
  const map: Record<string, string> = { suehiro: "末広", aikoku: "愛国", other: "その他" };
  return map[key] || "その他";
}
