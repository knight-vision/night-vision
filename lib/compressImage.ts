// アップロード前に画像をブラウザ側でリサイズ・圧縮する。
// スマホの写真は1枚で数MB〜十数MBあり、Next.jsのAPI body上限(約4MB)を
// 超えてアップロード失敗する原因になる。送信前に縮小して確実に通す。

const MAX_DIMENSION = 1600;      // 長辺の最大px（プロフィール写真には十分）
const TARGET_MAX_BYTES = 3 * 1024 * 1024; // 圧縮後の目標上限（約3MB、API上限に余裕）

export async function compressImage(file: File): Promise<File> {
  // GIFやSVGなどはそのまま返す（アニメーション保持・ベクター）
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (!file.type.startsWith("image/")) return file;

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  // 長辺がMAX_DIMENSION以下ならリサイズ不要だが、サイズが大きければ再エンコードで圧縮
  let { width, height } = img;
  const longSide = Math.max(width, height);
  if (longSide > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longSide;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // 失敗時は元ファイル
  ctx.drawImage(img, 0, 0, width, height);

  // 品質を段階的に下げて目標サイズ以下に収める
  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > TARGET_MAX_BYTES && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  if (!blob) return file;

  // 元がリサイズ不要かつ元の方が小さいなら元を使う
  if (longSide <= MAX_DIMENSION && blob.size >= file.size) return file;

  const newName = file.name.replace(/\.(png|webp|heic|heif|jpeg|jpg)$/i, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}
