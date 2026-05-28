// 日本全国の都道府県・市区町村データ

export type Prefecture = {
  key: string;       // URLスラッグ
  name: string;      // 表示名
  region: string;    // 地方区分
  cities: City[];
};

export type City = {
  key: string;       // URLスラッグ
  name: string;      // 表示名
  areas?: string[];  // 主要エリア（繁華街・駅名など）
};

export const PREFECTURES: Prefecture[] = [
  // ===== 北海道 =====
  { key: "hokkaido", name: "北海道", region: "北海道", cities: [
    { key: "sapporo",  name: "札幌市",  areas: ["すすきの", "大通", "札幌駅周辺", "円山"] },
    { key: "hakodate", name: "函館市",  areas: ["函館駅周辺", "西部地区", "五稜郭"] },
    { key: "asahikawa", name: "旭川市", areas: ["旭川駅周辺", "3条通", "常磐公園周辺"] },
    { key: "obihiro",  name: "帯広市",  areas: ["西2条南", "西3条南", "帯広駅周辺"] },
    { key: "kushiro",  name: "釧路市",  areas: ["末広", "愛国", "釧路駅周辺"] },
    { key: "kitami",   name: "北見市",  areas: ["北見駅周辺"] },
    { key: "tomakomai", name: "苫小牧市", areas: ["苫小牧駅周辺"] },
    { key: "muroran",  name: "室蘭市",  areas: ["室蘭駅周辺", "中島"] },
  ]},

  // ===== 東北 =====
  { key: "aomori", name: "青森県", region: "東北", cities: [
    { key: "aomori-city", name: "青森市", areas: ["新町", "青森駅周辺"] },
    { key: "hirosaki", name: "弘前市", areas: ["弘前駅周辺", "土手町"] },
    { key: "hachinohe", name: "八戸市", areas: ["八戸駅周辺", "三日町"] },
  ]},
  { key: "iwate", name: "岩手県", region: "東北", cities: [
    { key: "morioka", name: "盛岡市", areas: ["盛岡駅周辺", "大通", "菜園"] },
    { key: "ichinoseki", name: "一関市", areas: ["一関駅周辺"] },
  ]},
  { key: "miyagi", name: "宮城県", region: "東北", cities: [
    { key: "sendai", name: "仙台市", areas: ["国分町", "一番町", "仙台駅周辺", "大町"] },
    { key: "ishinomaki", name: "石巻市", areas: ["石巻駅周辺"] },
  ]},
  { key: "akita", name: "秋田県", region: "東北", cities: [
    { key: "akita-city", name: "秋田市", areas: ["秋田駅周辺", "川反", "大町"] },
    { key: "yokote", name: "横手市", areas: ["横手駅周辺"] },
  ]},
  { key: "yamagata", name: "山形県", region: "東北", cities: [
    { key: "yamagata-city", name: "山形市", areas: ["山形駅周辺", "七日町", "本町"] },
    { key: "tsuruoka", name: "鶴岡市", areas: ["鶴岡駅周辺"] },
  ]},
  { key: "fukushima", name: "福島県", region: "東北", cities: [
    { key: "fukushima-city", name: "福島市", areas: ["福島駅周辺", "本町"] },
    { key: "koriyama", name: "郡山市", areas: ["郡山駅周辺", "中町"] },
    { key: "iwaki", name: "いわき市", areas: ["小名浜", "平"] },
  ]},

  // ===== 関東 =====
  { key: "ibaraki", name: "茨城県", region: "関東", cities: [
    { key: "mito", name: "水戸市", areas: ["水戸駅周辺", "泉町", "宮町"] },
    { key: "tsukuba", name: "つくば市", areas: ["つくば駅周辺", "研究学園"] },
    { key: "hitachi", name: "日立市", areas: ["日立駅周辺"] },
  ]},
  { key: "tochigi", name: "栃木県", region: "関東", cities: [
    { key: "utsunomiya", name: "宇都宮市", areas: ["宇都宮駅周辺", "二荒山神社周辺", "大通り"] },
    { key: "oyama", name: "小山市", areas: ["小山駅周辺"] },
    { key: "nikko", name: "日光市", areas: ["今市駅周辺"] },
  ]},
  { key: "gunma", name: "群馬県", region: "関東", cities: [
    { key: "maebashi", name: "前橋市", areas: ["前橋駅周辺", "中心街"] },
    { key: "takasaki", name: "高崎市", areas: ["高崎駅周辺", "中央銀座"] },
    { key: "ota", name: "太田市", areas: ["太田駅周辺"] },
  ]},
  { key: "saitama", name: "埼玉県", region: "関東", cities: [
    { key: "omiya", name: "さいたま市大宮区", areas: ["大宮駅周辺", "一番街"] },
    { key: "urawa", name: "さいたま市浦和区", areas: ["浦和駅周辺"] },
    { key: "kawagoe", name: "川越市", areas: ["川越駅周辺", "本川越"] },
    { key: "kawaguchi", name: "川口市", areas: ["川口駅周辺"] },
    { key: "tokorozawa", name: "所沢市", areas: ["所沢駅周辺"] },
    { key: "koshigaya", name: "越谷市", areas: ["越谷駅周辺"] },
  ]},
  { key: "chiba", name: "千葉県", region: "関東", cities: [
    { key: "chiba-city", name: "千葉市", areas: ["千葉駅周辺", "栄町", "富士見町"] },
    { key: "funabashi", name: "船橋市", areas: ["船橋駅周辺"] },
    { key: "matsudo", name: "松戸市", areas: ["松戸駅周辺"] },
    { key: "ichikawa", name: "市川市", areas: ["本八幡"] },
    { key: "kashiwa", name: "柏市", areas: ["柏駅周辺"] },
    { key: "narita", name: "成田市", areas: ["成田駅周辺"] },
  ]},
  { key: "tokyo", name: "東京都", region: "関東", cities: [
    { key: "shinjuku",   name: "新宿区", areas: ["歌舞伎町", "新宿三丁目", "西新宿", "新大久保"] },
    { key: "shibuya",    name: "渋谷区", areas: ["渋谷", "恵比寿", "代官山", "中目黒"] },
    { key: "minato",     name: "港区",   areas: ["六本木", "麻布十番", "西麻布", "赤坂", "新橋", "品川"] },
    { key: "chiyoda",    name: "千代田区", areas: ["秋葉原", "神田", "有楽町"] },
    { key: "chuo",       name: "中央区", areas: ["銀座", "築地", "日本橋"] },
    { key: "taito",      name: "台東区", areas: ["上野", "御徒町", "浅草", "上野広小路"] },
    { key: "sumida",     name: "墨田区", areas: ["錦糸町", "押上"] },
    { key: "koto",       name: "江東区", areas: ["木場", "豊洲"] },
    { key: "shinagawa",  name: "品川区", areas: ["品川駅周辺", "五反田", "大崎"] },
    { key: "meguro",     name: "目黒区", areas: ["中目黒", "目黒駅周辺"] },
    { key: "ota",        name: "大田区", areas: ["蒲田", "大森"] },
    { key: "setagaya",   name: "世田谷区", areas: ["三軒茶屋", "下北沢"] },
    { key: "nakano",     name: "中野区", areas: ["中野駅周辺"] },
    { key: "suginami",   name: "杉並区", areas: ["荻窪", "阿佐ヶ谷", "高円寺"] },
    { key: "toshima",    name: "豊島区", areas: ["池袋", "要町"] },
    { key: "kita",       name: "北区",   areas: ["赤羽", "王子"] },
    { key: "arakawa",    name: "荒川区", areas: ["日暮里", "三河島"] },
    { key: "itabashi",   name: "板橋区", areas: ["大山", "板橋駅周辺"] },
    { key: "nerima",     name: "練馬区", areas: ["練馬駅周辺", "石神井公園"] },
    { key: "adachi",     name: "足立区", areas: ["北千住", "西新井"] },
    { key: "katsushika", name: "葛飾区", areas: ["亀有", "金町"] },
    { key: "edogawa",    name: "江戸川区", areas: ["小岩", "葛西"] },
    { key: "hachioji",   name: "八王子市", areas: ["八王子駅周辺", "本町"] },
    { key: "tachikawa",  name: "立川市",  areas: ["錦町", "柴崎町", "立川駅周辺"] },
    { key: "musashino",  name: "武蔵野市", areas: ["吉祥寺", "三鷹"] },
    { key: "mitaka",     name: "三鷹市",  areas: ["三鷹駅周辺"] },
    { key: "fuchu",      name: "府中市",  areas: ["府中駅周辺"] },
    { key: "chofu",      name: "調布市",  areas: ["調布駅周辺"] },
  ]},
  { key: "kanagawa", name: "神奈川県", region: "関東", cities: [
    { key: "yokohama-naka", name: "横浜市中区", areas: ["関内", "伊勢佐木町", "横浜中華街"] },
    { key: "yokohama-nishi", name: "横浜市西区", areas: ["横浜駅周辺", "西口", "東口"] },
    { key: "kawasaki-nakahara", name: "川崎市中原区", areas: ["武蔵小杉"] },
    { key: "kawasaki-kawasaki", name: "川崎市川崎区", areas: ["川崎駅周辺", "堀之内"] },
    { key: "sagamihara", name: "相模原市", areas: ["橋本", "相模大野"] },
    { key: "fujisawa", name: "藤沢市", areas: ["藤沢駅周辺", "辻堂"] },
    { key: "hiratsuka", name: "平塚市", areas: ["平塚駅周辺"] },
    { key: "yokosuka", name: "横須賀市", areas: ["横須賀中央"] },
    { key: "odawara", name: "小田原市", areas: ["小田原駅周辺"] },
    { key: "atsugi", name: "厚木市", areas: ["本厚木駅周辺"] },
  ]},

  // ===== 中部 =====
  { key: "niigata", name: "新潟県", region: "中部", cities: [
    { key: "niigata-city", name: "新潟市", areas: ["古町", "新潟駅周辺", "万代"] },
    { key: "nagaoka", name: "長岡市", areas: ["長岡駅周辺"] },
  ]},
  { key: "toyama", name: "富山県", region: "中部", cities: [
    { key: "toyama-city", name: "富山市", areas: ["富山駅周辺", "桜町", "総曲輪"] },
    { key: "takaoka", name: "高岡市", areas: ["高岡駅周辺"] },
  ]},
  { key: "ishikawa", name: "石川県", region: "中部", cities: [
    { key: "kanazawa", name: "金沢市", areas: ["片町", "香林坊", "武蔵", "金沢駅周辺"] },
    { key: "hakusan", name: "白山市", areas: ["松任駅周辺"] },
  ]},
  { key: "fukui", name: "福井県", region: "中部", cities: [
    { key: "fukui-city", name: "福井市", areas: ["福井駅周辺", "片町"] },
    { key: "sabae", name: "鯖江市", areas: ["鯖江駅周辺"] },
  ]},
  { key: "yamanashi", name: "山梨県", region: "中部", cities: [
    { key: "kofu", name: "甲府市", areas: ["甲府駅周辺", "中心街"] },
    { key: "fujiyoshida", name: "富士吉田市", areas: ["富士山口"] },
  ]},
  { key: "nagano", name: "長野県", region: "中部", cities: [
    { key: "nagano-city", name: "長野市", areas: ["長野駅周辺", "権堂"] },
    { key: "matsumoto", name: "松本市", areas: ["松本駅周辺", "伊勢町"] },
    { key: "ueda", name: "上田市", areas: ["上田駅周辺"] },
  ]},
  { key: "gifu", name: "岐阜県", region: "中部", cities: [
    { key: "gifu-city", name: "岐阜市", areas: ["柳ヶ瀬", "岐阜駅周辺"] },
    { key: "ogaki", name: "大垣市", areas: ["大垣駅周辺"] },
    { key: "takayama", name: "高山市", areas: ["高山駅周辺"] },
  ]},
  { key: "shizuoka", name: "静岡県", region: "中部", cities: [
    { key: "shizuoka-city", name: "静岡市", areas: ["両替町", "静岡駅周辺", "七間町"] },
    { key: "hamamatsu", name: "浜松市", areas: ["田町", "浜松駅周辺", "鍛冶町"] },
    { key: "numazu", name: "沼津市", areas: ["沼津駅周辺"] },
    { key: "fujinomiya", name: "富士宮市", areas: ["富士宮駅周辺"] },
  ]},
  { key: "aichi", name: "愛知県", region: "中部", cities: [
    { key: "nagoya-naka", name: "名古屋市中区", areas: ["錦三", "栄", "大須", "矢場町"] },
    { key: "nagoya-nishi", name: "名古屋市西区", areas: ["名古屋駅周辺", "太閤通"] },
    { key: "nagoya-chikusa", name: "名古屋市千種区", areas: ["今池", "池下"] },
    { key: "toyoda", name: "豊田市", areas: ["豊田駅周辺"] },
    { key: "toyohashi", name: "豊橋市", areas: ["豊橋駅周辺", "広小路"] },
    { key: "okazaki", name: "岡崎市", areas: ["岡崎駅周辺"] },
    { key: "ichinomiya", name: "一宮市", areas: ["一宮駅周辺"] },
    { key: "kasugai", name: "春日井市", areas: ["春日井駅周辺"] },
  ]},
  { key: "mie", name: "三重県", region: "中部", cities: [
    { key: "tsu", name: "津市", areas: ["津駅周辺"] },
    { key: "yokkaichi", name: "四日市市", areas: ["四日市駅周辺", "諏訪"] },
    { key: "suzuka", name: "鈴鹿市", areas: ["鈴鹿駅周辺"] },
  ]},

  // ===== 近畿 =====
  { key: "shiga", name: "滋賀県", region: "近畿", cities: [
    { key: "otsu", name: "大津市", areas: ["大津駅周辺"] },
    { key: "kusatsu", name: "草津市", areas: ["草津駅周辺"] },
    { key: "moriyama", name: "守山市", areas: ["守山駅周辺"] },
  ]},
  { key: "kyoto", name: "京都府", region: "近畿", cities: [
    { key: "kyoto-city", name: "京都市", areas: ["祇園", "木屋町", "河原町", "烏丸", "四条", "北野"] },
    { key: "uji", name: "宇治市", areas: ["宇治駅周辺"] },
  ]},
  { key: "osaka", name: "大阪府", region: "近畿", cities: [
    { key: "namba",       name: "大阪市中央区・浪速区", areas: ["難波", "心斎橋", "道頓堀", "日本橋"] },
    { key: "kita",        name: "大阪市北区",   areas: ["梅田", "北新地", "天満", "中崎町"] },
    { key: "higashinari", name: "大阪市東成区", areas: ["今里"] },
    { key: "nishiku",     name: "大阪市西区",   areas: ["九条", "西九条"] },
    { key: "tenjinbashi", name: "大阪市天王寺区", areas: ["天王寺", "あべの"] },
    { key: "sakai",     name: "堺市", areas: ["堺東", "堺駅周辺"] },
    { key: "higashiosaka", name: "東大阪市", areas: ["布施", "長田"] },
    { key: "toyonaka",  name: "豊中市", areas: ["豊中駅周辺", "蛍池"] },
    { key: "suita",     name: "吹田市", areas: ["江坂", "吹田駅周辺"] },
    { key: "hirakata",  name: "枚方市", areas: ["枚方市駅周辺"] },
    { key: "takatsuki", name: "高槻市", areas: ["高槻駅周辺"] },
  ]},
  { key: "hyogo", name: "兵庫県", region: "近畿", cities: [
    { key: "kobe-chuo", name: "神戸市中央区", areas: ["三宮", "北野", "生田新道"] },
    { key: "kobe-nada", name: "神戸市灘区", areas: ["六甲道", "灘駅周辺"] },
    { key: "amagasaki", name: "尼崎市", areas: ["尼崎駅周辺"] },
    { key: "nishinomiya", name: "西宮市", areas: ["西宮北口", "夙川"] },
    { key: "himeji", name: "姫路市", areas: ["姫路駅周辺", "本町"] },
    { key: "akashi", name: "明石市", areas: ["明石駅周辺"] },
  ]},
  { key: "nara", name: "奈良県", region: "近畿", cities: [
    { key: "nara-city", name: "奈良市", areas: ["近鉄奈良駅周辺", "三条通"] },
    { key: "kashihara", name: "橿原市", areas: ["大和八木駅周辺"] },
  ]},
  { key: "wakayama", name: "和歌山県", region: "近畿", cities: [
    { key: "wakayama-city", name: "和歌山市", areas: ["和歌山駅周辺", "ぶらくり丁"] },
  ]},

  // ===== 中国 =====
  { key: "tottori", name: "鳥取県", region: "中国", cities: [
    { key: "tottori-city", name: "鳥取市", areas: ["鳥取駅周辺"] },
    { key: "yonago", name: "米子市", areas: ["米子駅周辺"] },
  ]},
  { key: "shimane", name: "島根県", region: "中国", cities: [
    { key: "matsue", name: "松江市", areas: ["松江駅周辺", "白潟"] },
    { key: "izumo", name: "出雲市", areas: ["出雲市駅周辺"] },
  ]},
  { key: "okayama", name: "岡山県", region: "中国", cities: [
    { key: "okayama-city", name: "岡山市", areas: ["岡山駅周辺", "表町"] },
    { key: "kurashiki", name: "倉敷市", areas: ["倉敷駅周辺", "美観地区"] },
  ]},
  { key: "hiroshima", name: "広島県", region: "中国", cities: [
    { key: "hiroshima-city", name: "広島市", areas: ["流川", "薬研堀", "中洲", "紙屋町"] },
    { key: "fukuyama", name: "福山市", areas: ["福山駅周辺"] },
    { key: "kure", name: "呉市", areas: ["呉駅周辺"] },
  ]},
  { key: "yamaguchi", name: "山口県", region: "中国", cities: [
    { key: "shimonoseki", name: "下関市", areas: ["唐戸", "下関駅周辺"] },
    { key: "yamaguchi-city", name: "山口市", areas: ["湯田温泉"] },
    { key: "ube", name: "宇部市", areas: ["宇部駅周辺"] },
  ]},

  // ===== 四国 =====
  { key: "tokushima", name: "徳島県", region: "四国", cities: [
    { key: "tokushima-city", name: "徳島市", areas: ["徳島駅周辺", "秋田町"] },
  ]},
  { key: "kagawa", name: "香川県", region: "四国", cities: [
    { key: "takamatsu", name: "高松市", areas: ["高松駅周辺", "瓦町", "片原町"] },
    { key: "marugame", name: "丸亀市", areas: ["丸亀駅周辺"] },
  ]},
  { key: "ehime", name: "愛媛県", region: "四国", cities: [
    { key: "matsuyama", name: "松山市", areas: ["松山市駅周辺", "大街道", "二番町"] },
    { key: "imabari", name: "今治市", areas: ["今治駅周辺"] },
  ]},
  { key: "kochi", name: "高知県", region: "四国", cities: [
    { key: "kochi-city", name: "高知市", areas: ["帯屋町", "はりまや橋周辺", "新京橋"] },
  ]},

  // ===== 九州・沖縄 =====
  { key: "fukuoka", name: "福岡県", region: "九州・沖縄", cities: [
    { key: "hakata",    name: "福岡市博多区", areas: ["中洲", "博多駅周辺", "春吉"] },
    { key: "chuo-ku",  name: "福岡市中央区", areas: ["天神", "薬院", "大名"] },
    { key: "kitakyushu", name: "北九州市",   areas: ["小倉駅周辺", "旦過", "魚町"] },
    { key: "kurume",   name: "久留米市", areas: ["久留米駅周辺", "文化街"] },
  ]},
  { key: "saga", name: "佐賀県", region: "九州・沖縄", cities: [
    { key: "saga-city", name: "佐賀市", areas: ["佐賀駅周辺", "中心部"] },
    { key: "karatsu", name: "唐津市", areas: ["唐津駅周辺"] },
  ]},
  { key: "nagasaki", name: "長崎県", region: "九州・沖縄", cities: [
    { key: "nagasaki-city", name: "長崎市", areas: ["思案橋", "浜町", "観光通り"] },
    { key: "sasebo", name: "佐世保市", areas: ["佐世保駅周辺", "京町"] },
  ]},
  { key: "kumamoto", name: "熊本県", region: "九州・沖縄", cities: [
    { key: "kumamoto-city", name: "熊本市", areas: ["下通", "上通", "新市街", "熊本駅周辺"] },
    { key: "yatsushiro", name: "八代市", areas: ["八代駅周辺"] },
  ]},
  { key: "oita", name: "大分県", region: "九州・沖縄", cities: [
    { key: "oita-city", name: "大分市", areas: ["都町", "大分駅周辺", "中央町"] },
    { key: "beppu", name: "別府市", areas: ["別府駅周辺", "北浜"] },
  ]},
  { key: "miyazaki", name: "宮崎県", region: "九州・沖縄", cities: [
    { key: "miyazaki-city", name: "宮崎市", areas: ["宮崎駅周辺", "ニシタチ"] },
    { key: "miyakonojo", name: "都城市", areas: ["都城駅周辺"] },
  ]},
  { key: "kagoshima", name: "鹿児島県", region: "九州・沖縄", cities: [
    { key: "kagoshima-city", name: "鹿児島市", areas: ["天文館", "鹿児島中央駅周辺"] },
    { key: "kirishima", name: "霧島市", areas: ["国分駅周辺"] },
  ]},
  { key: "okinawa", name: "沖縄県", region: "九州・沖縄", cities: [
    { key: "naha",       name: "那覇市",    areas: ["松山", "栄町", "国際通り"] },
    { key: "okinawa-city", name: "沖縄市", areas: ["コザ", "ゲート通り"] },
    { key: "uruma",      name: "うるま市",  areas: ["具志川"] },
    { key: "nago",       name: "名護市",    areas: ["名護駅周辺"] },
  ]},
];

// 都道府県キーから Prefecture を取得
export function getPrefecture(key: string) {
  return PREFECTURES.find(p => p.key === key);
}

// 都道府県・市区町村キーから City を取得
export function getJapanCity(prefKey: string, cityKey: string) {
  const pref = getPrefecture(prefKey);
  return pref?.cities.find(c => c.key === cityKey);
}

// 住所文字列から都道府県・市区町村を推定
export function detectLocationFromAddress(address: string): { prefecture: Prefecture | null; city: City | null; area: string | null } {
  for (const pref of PREFECTURES) {
    if (address.includes(pref.name)) {
      for (const city of pref.cities) {
        if (address.includes(city.name.replace(/市|区|町|村|郡/, ""))) {
          // エリアも推定
          const area = city.areas?.find(a => address.includes(a)) || null;
          return { prefecture: pref, city, area };
        }
      }
      // 市が見つからなくても都道府県はわかった
      return { prefecture: pref, city: null, area: null };
    }
  }
  return { prefecture: null, city: null, area: null };
}

// 地方ごとにグループ化
export function getPrefecturesByRegion() {
  const regions: Record<string, Prefecture[]> = {};
  for (const pref of PREFECTURES) {
    if (!regions[pref.region]) regions[pref.region] = [];
    regions[pref.region].push(pref);
  }
  return regions;
}

export const REGION_ORDER = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州・沖縄"];
