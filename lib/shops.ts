export type PlanType = 'free' | 'standard' | 'premium';

export type Cast = {
  id: number;
  name: string;
  age: number;
  comment: string;
  on_today: boolean;
  instagram: string | null;
};

export type Shop = {
  id: number;
  slug: string;
  name: string;
  type: 'スナック' | 'ガールズバー' | 'ラウンジ';
  area: string;
  budget: string;
  openHour: string;
  tel: string;
  description: string;
  tags: string[];
  instagram: string | null;
  image: string | null;
  plan: PlanType;
  referred: boolean;
  casts: Cast[];
};

export const SHOPS: Shop[] = [
  {
    id: 1,
    slug: 'hanabi',
    name: 'スナック 花火',
    type: 'スナック',
    area: '末広町',
    budget: '3,000〜5,000円',
    openHour: '20:00〜翌3:00',
    tel: '0154-XX-XXXX',
    description:
      'アットホームな雰囲気が自慢の老舗スナック。ママが気さくで初めての方も安心。カラオケで盛り上がれます。',
    tags: ['カラオケあり', '初見歓迎', '駐車場あり'],
    instagram: 'hanabi_snack',
    image: null,
    plan: 'premium',
    referred: true,
    casts: [
      {
        id: 1,
        name: 'さくら',
        age: 24,
        comment: 'お酒一緒に楽しみましょう🌸',
        on_today: true,
        instagram: 'sakura_hanabi',
      },
      {
        id: 2,
        name: 'れな',
        age: 22,
        comment: '歌大好き！一緒に歌いましょ',
        on_today: true,
        instagram: null,
      },
      {
        id: 3,
        name: 'みゆ',
        age: 26,
        comment: 'ゆっくりお話しましょ',
        on_today: false,
        instagram: 'miyu_night',
      },
    ],
  },
  {
    id: 2,
    slug: 'neon',
    name: 'ガールズバー NEON',
    type: 'ガールズバー',
    area: '北大通',
    budget: '2,000〜4,000円',
    openHour: '19:00〜翌2:00',
    tel: '0154-YY-YYYY',
    description:
      'おしゃれな内装で写真映え抜群。カクテルが豊富でデートにも最適なガールズバー。',
    tags: ['フォトジェニック', 'カクテル豊富', '女性歓迎'],
    instagram: 'neon_kushiro',
    image: null,
    plan: 'standard',
    referred: false,
    casts: [
      {
        id: 4,
        name: 'あおい',
        age: 21,
        comment: '初めての方も大歓迎です！',
        on_today: true,
        instagram: 'aoi_neon',
      },
      {
        id: 5,
        name: 'ゆい',
        age: 23,
        comment: 'お酒もトークも全力で！',
        on_today: false,
        instagram: null,
      },
    ],
  },
  {
    id: 3,
    slug: 'luna',
    name: 'ラウンジ LUNA',
    type: 'ラウンジ',
    area: '末広町',
    budget: '5,000〜10,000円',
    openHour: '20:00〜翌4:00',
    tel: '0154-ZZ-ZZZZ',
    description:
      '落ち着いた高級感のある空間。接客のプロが揃う釧路の人気ラウンジです。',
    tags: ['完全個室あり', 'ボトルキープ可', '記念日歓迎'],
    instagram: 'luna_lounge_kushiro',
    image: null,
    plan: 'premium',
    referred: false,
    casts: [
      {
        id: 6,
        name: 'まお',
        age: 25,
        comment: '特別な夜を演出します',
        on_today: true,
        instagram: 'mao_luna',
      },
      {
        id: 7,
        name: 'りか',
        age: 27,
        comment: 'ゆったりとした時間を',
        on_today: true,
        instagram: 'rika_luna',
      },
      {
        id: 8,
        name: 'なな',
        age: 22,
        comment: '笑顔でお迎えします！',
        on_today: false,
        instagram: null,
      },
    ],
  },
  {
    id: 4,
    slug: 'muteki',
    name: 'スナック 霧笛',
    type: 'スナック',
    area: '新橋大通',
    budget: '2,500〜4,000円',
    openHour: '21:00〜翌2:00',
    tel: '0154-AA-AAAA',
    description:
      '釧路港を眺めながら飲める絶景スナック。地元の常連さんに愛される名店。',
    tags: ['夜景あり', '地酒充実', '常連多め'],
    instagram: 'muteki_snack',
    image: null,
    plan: 'free',
    referred: false,
    casts: [
      {
        id: 9,
        name: 'ひかり',
        age: 28,
        comment: '釧路生まれ釧路育ち！',
        on_today: true,
        instagram: null,
      },
      {
        id: 10,
        name: 'こと',
        age: 23,
        comment: '地酒のことなら任せて',
        on_today: false,
        instagram: 'koto_muteki',
      },
    ],
  },
];

export function getShopsByType(type: Shop['type']): Shop[] {
  return SHOPS.filter((s) => s.type === type);
}

export function getShopBySlug(slug: string): Shop | undefined {
  return SHOPS.find((s) => s.slug === slug);
}
