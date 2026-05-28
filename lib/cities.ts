// 都市設定ファイル
// 新都市追加時はここに追加するだけ

export type CityConfig = {
  key: string;           // URLスラッグ（例: kushiro, sapporo）
  prefectureKey: string; // 都道府県URLスラッグ（例: hokkaido, tokyo）
  name: string;          // 表示名（例: 釧路）
  prefecture: string;    // 都道府県表示名
  description: string;
  areas: AreaConfig[];
  genres: GenreConfig[];
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

// 北海道以外はキャバクラ/ラウンジ表記
export const GENRES_MAINLAND: GenreConfig[] = [
  { key: "lounge",      name: "キャバクラ/ラウンジ", dbType: "ラウンジ",       englishLabel: "CABARET/LOUNGE" },
  { key: "girls-bar",   name: "ガールズバー",         dbType: "ガールズバー",   englishLabel: "GIRLS BAR" },
  { key: "snack",       name: "スナック",             dbType: "スナック",       englishLabel: "SNACK" },
  { key: "casual-bar",  name: "カジュアルバー",       dbType: "カジュアルバー", englishLabel: "CASUAL BAR" },
];

export function getGenresForPrefecture(prefectureKey: string): GenreConfig[] {
  return prefectureKey === "hokkaido" ? GENRES : GENRES_MAINLAND;
}

export const CITIES: CityConfig[] = [
  {
    key: "kushiro",
    prefectureKey: "hokkaido",
    name: "釧路",
    prefecture: "北海道",
    description: "北海道釧路市の夜遊びスポット情報。ラウンジ・ガールズバー・スナック・キャバクラを地域密着で紹介。",
    areas: [
      { key: "suehiro", name: "末広",   description: "釧路最大の繁華街。ラウンジ・スナック・ガールズバーが集中。" },
      { key: "aikoku",  name: "愛国",   description: "釧路市愛国エリア。地元密着の飲み屋が多い落ち着いたエリア。" },
      { key: "other",   name: "その他", description: "釧路市内その他のエリア。" },
    ],
    genres: GENRES,
  },
  {
    key: "sapporo",
    prefectureKey: "hokkaido",
    name: "札幌",
    prefecture: "北海道",
    description: "北海道札幌市の夜遊びスポット情報。すすきのを中心にラウンジ・ガールズバー・スナック・キャバクラを紹介。",
    areas: [
      { key: "susukino",        name: "すすきの",    description: "北海道最大の歓楽街。キャバクラ・ラウンジ・ガールズバーが集中するエリア。" },
      { key: "odori",           name: "大通",        description: "大通公園周辺エリア。オフィス街に隣接した飲み屋が揃う。" },
      { key: "sapporo-station", name: "札幌駅周辺",  description: "札幌駅・北口・南口周辺の飲み屋エリア。" },
      { key: "other",           name: "その他",      description: "札幌市内その他のエリア。" },
    ],
    genres: GENRES,
  },
  {
    key: "obihiro",
    prefectureKey: "hokkaido",
    name: "帯広",
    prefecture: "北海道",
    description: "北海道帯広市の夜遊びスポット情報。西2条南エリアを中心にラウンジ・ガールズバー・スナックを紹介。",
    areas: [
      { key: "nishi2", name: "西2条南", description: "帯広の繁華街の中心。スナック・ラウンジが集まるエリア。" },
      { key: "nishi3", name: "西3条南", description: "帯広市内の飲み屋が多いエリア。" },
      { key: "other",  name: "その他",  description: "帯広市内その他のエリア。" },
    ],
    genres: GENRES,
  },
  {
    key: "tachikawa",
    prefectureKey: "tokyo",
    name: "立川",
    prefecture: "東京都",
    description: "東京都立川市の夜遊びスポット情報。錦町・柴崎町エリアを中心にラウンジ・ガールズバー・スナックを紹介。",
    areas: [
      { key: "nishikicho", name: "錦町",   description: "立川駅北口エリア。ガールズバー・スナックが集まる繁華街。" },
      { key: "shibasaki",  name: "柴崎町", description: "立川駅南口方面の飲み屋エリア。" },
      { key: "other",      name: "その他", description: "立川市内その他のエリア。" },
    ],
    genres: GENRES_MAINLAND,
  },
  {
    key: "shinjuku",
    prefectureKey: "tokyo",
    name: "新宿",
    prefecture: "東京都",
    description: "東京都新宿区の夜遊びスポット情報。歌舞伎町・新宿三丁目・西新宿エリアのラウンジ・ガールズバー・スナックを紹介。",
    areas: [
      { key: "kabukicho",     name: "歌舞伎町",   description: "日本最大の歓楽街。キャバクラ・ラウンジ・ガールズバーが集中。" },
      { key: "sanchome",      name: "新宿三丁目", description: "新宿三丁目駅周辺の飲み屋エリア。落ち着いた雰囲気の店が多い。" },
      { key: "nishishinjuku", name: "西新宿",     description: "西新宿のオフィス街に隣接した飲み屋エリア。" },
      { key: "other",         name: "その他",     description: "新宿区内その他のエリア。" },
    ],
    genres: GENRES_MAINLAND,
  },
  {
    key: "roppongi",
    prefectureKey: "tokyo",
    name: "六本木",
    prefecture: "東京都",
    description: "東京都港区六本木の夜遊びスポット情報。六本木交差点・西麻布エリアのラウンジ・ガールズバー・クラブを紹介。",
    areas: [
      { key: "crossing",   name: "六本木交差点周辺", description: "六本木の中心部。ラウンジ・クラブ・ガールズバーが集中するエリア。" },
      { key: "nishiazabu", name: "西麻布",           description: "六本木に隣接する高級エリア。上質なラウンジ・バーが揃う。" },
      { key: "azabu",      name: "麻布十番",         description: "麻布十番駅周辺の飲み屋エリア。" },
      { key: "other",      name: "その他",           description: "港区六本木周辺その他のエリア。" },
    ],
    genres: GENRES_MAINLAND,
  },
  {
    key: "ueno",
    prefectureKey: "tokyo",
    name: "上野",
    prefecture: "東京都",
    description: "東京都台東区上野の夜遊びスポット情報。上野駅周辺・御徒町エリアのラウンジ・ガールズバー・スナックを紹介。",
    areas: [
      { key: "ueno-station", name: "上野駅周辺", description: "上野駅東口・広小路方面の繁華街。スナック・ガールズバーが集まるエリア。" },
      { key: "okachimachi",  name: "御徒町",     description: "御徒町駅周辺の飲み屋エリア。アメ横に隣接した活気あるエリア。" },
      { key: "other",        name: "その他",     description: "台東区上野周辺その他のエリア。" },
    ],
    genres: GENRES_MAINLAND,
  },
];
export function getCity(key: string): CityConfig | undefined {
  return CITIES.find(c => c.key === key);
}

export function getCityByPrefecture(prefectureKey: string, cityKey: string): CityConfig | undefined {
  return CITIES.find(c => c.prefectureKey === prefectureKey && c.key === cityKey);
}

export function getCitiesByPrefecture(prefectureKey: string): CityConfig[] {
  return CITIES.filter(c => c.prefectureKey === prefectureKey);
}

export const PREFECTURE_NAMES: Record<string, string> = {
  hokkaido: "北海道",
  tokyo: "東京都",
  osaka: "大阪府",
  aichi: "愛知県",
};

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
