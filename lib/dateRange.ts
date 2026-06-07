// 月（"2026-06"）から、その月の日付範囲を安全に返す。
// 「翌月1日未満」を使うことで、月末が28/30/31日でも正しく動く。
// 旧コードの `${month}-31` は6月31日など不正な日付を生み、
// date型カラムとの比較でエラー/0件になるバグがあった。
export function monthRange(month: string): { start: string; endExclusive: string } {
  const [y, mo] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endExclusive = mo === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
  return { start, endExclusive };
}

// 「その月の末日」を YYYY-MM-DD で返す（表示や <= 比較が必要な箇所用）
export function monthLastDay(month: string): string {
  const [y, mo] = month.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate(); // mo月の0日=前月末→mo月の末日
  return `${month}-${String(last).padStart(2, "0")}`;
}
