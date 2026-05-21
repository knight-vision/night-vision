// メール共通テンプレート
// ※ メールクライアントはSVG・CSS background-image・多くのCSS3を無視するため
//   テーブルレイアウト＋インラインスタイルのみで実装

export function emailHtml({
  preheader = "",
  title,
  body,
  ctaText,
  ctaUrl,
  footerNote = "",
}: {
  preheader?: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}) {
  const cta = ctaText && ctaUrl ? `
    <tr><td align="center" style="padding:24px 0 8px;">
      <a href="${ctaUrl}" target="_blank"
        style="display:inline-block;background-color:#a855f7;color:#ffffff;
          font-weight:800;font-size:15px;padding:14px 36px;
          border-radius:30px;text-decoration:none;letter-spacing:0.05em;">
        ${ctaText} &rarr;
      </a>
    </td></tr>` : "";

  return `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#08080f;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#08080f;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}

  <!-- 外側ラッパー -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#08080f;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- 本体テーブル（最大560px） -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- ===== ロゴヘッダー ===== -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0" style="background-color:#12022a;border:1px solid #3b1f5e;border-radius:16px;">
                <tr>
                  <td align="center" style="padding:20px 40px;">

                    <!-- フクロウアイコン（テキストアート） -->
                    <div style="font-size:36px;line-height:1;margin-bottom:8px;">🦉</div>

                    <!-- サイト名 -->
                    <div style="font-size:20px;font-weight:900;color:#e879f9;letter-spacing:-0.01em;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
                      釧路ナイトビジョン
                    </div>
                    <div style="font-size:10px;color:#6b21a8;letter-spacing:0.18em;margin-top:4px;font-family:Arial,sans-serif;">
                      KUSHIRO NIGHT VISION
                    </div>

                    <!-- アクセントライン -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:10px auto 0;">
                      <tr>
                        <td style="width:20px;height:2px;background-color:#ff6b9d;border-radius:1px;"></td>
                        <td style="width:6px;"></td>
                        <td style="width:40px;height:2px;background-color:#a855f7;border-radius:1px;"></td>
                        <td style="width:6px;"></td>
                        <td style="width:20px;height:2px;background-color:#ff6b9d;border-radius:1px;"></td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== メインカード ===== -->
          <tr>
            <td style="background-color:#0f0f1a;border:1px solid #2d1b4e;border-radius:20px;padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- タイトル帯 -->
                <tr>
                  <td style="background-color:#1a0a2e;border-radius:20px 20px 0 0;padding:20px 28px 18px;border-bottom:1px solid #2d1b4e;">
                    <div style="font-size:17px;font-weight:800;color:#f0eeff;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
                      ${title}
                    </div>
                  </td>
                </tr>

                <!-- 本文 -->
                <tr>
                  <td style="padding:24px 28px;color:#c0bdd8;font-size:14px;line-height:1.9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td>${body}</td></tr>
                      ${cta}
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ===== フッター ===== -->
          <tr>
            <td align="center" style="padding:20px 0 8px;">
              ${footerNote ? `<p style="color:#4b3a6e;font-size:12px;margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">${footerNote}</p>` : ""}
              <p style="color:#3b2d55;font-size:11px;margin:0;line-height:2;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
                釧路ナイトビジョン &nbsp;&middot;&nbsp;
                <a href="https://www.night-vision.jp" style="color:#7c3aed;text-decoration:none;">night-vision.jp</a>
                &nbsp;&middot;&nbsp; info@night-vision.jp
              </p>
              <!-- 下部アクセントドット -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0;">
                <tr>
                  <td style="width:4px;height:4px;background-color:#ff6b9d;border-radius:50%;"></td>
                  <td style="width:6px;"></td>
                  <td style="width:4px;height:4px;background-color:#a855f7;border-radius:50%;"></td>
                  <td style="width:6px;"></td>
                  <td style="width:4px;height:4px;background-color:#ff6b9d;border-radius:50%;"></td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// メール内の情報テーブル（キー・バリュー形式）
export function emailInfoTable(rows: { label: string; value: string; highlight?: boolean }[]) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a1a;border-radius:10px;margin:12px 0;overflow:hidden;">
      ${rows.map((r, i) => `
        <tr style="border-top:${i > 0 ? "1px solid #1e1a35" : "none"};">
          <td style="padding:10px 14px;font-size:12px;color:#7c6fa8;width:130px;vertical-align:top;">${r.label}</td>
          <td style="padding:10px 14px;font-size:14px;color:${r.highlight ? "#e879f9" : "#e2e0ef"};font-weight:${r.highlight ? "800" : "600"};letter-spacing:${r.highlight ? "0.08em" : "0"};">${r.value}</td>
        </tr>`).join("")}
    </table>`;
}

// メール内の日程リスト
export function emailDateList(items: { date: string; time: string; note?: string }[]) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a1a;border-radius:10px;margin:12px 0;overflow:hidden;">
      ${items.map((item, i) => `
        <tr style="border-top:${i > 0 ? "1px solid #1e1a35" : "none"};">
          <td style="padding:10px 14px;">
            <span style="font-size:13px;color:#a855f7;font-weight:700;">${item.date}</span>
            <span style="font-size:13px;color:#e2e0ef;margin-left:12px;">${item.time}</span>
            ${item.note ? `<span style="font-size:12px;color:#6b5a8e;margin-left:8px;">※${item.note}</span>` : ""}
          </td>
        </tr>`).join("")}
    </table>`;
}
