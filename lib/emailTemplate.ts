// 全メール共通のHTMLテンプレート
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
    <div style="text-align:center;margin:32px 0;">
      <a href="${ctaUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#c084fc,#f472b6);
        color:#ffffff;font-weight:700;font-size:15px;padding:14px 36px;
        border-radius:30px;text-decoration:none;letter-spacing:0.04em;
        box-shadow:0 4px 20px rgba(192,132,252,0.4);">
        ${ctaText}
      </a>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">

        <!-- ロゴヘッダー -->
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#1a1a2e,#16213e);
            border:1px solid rgba(192,132,252,0.3);border-radius:20px;padding:20px 32px;">
            <div style="font-size:28px;margin-bottom:4px;">🦉</div>
            <div style="background:linear-gradient(135deg,#c084fc,#f472b6);
              -webkit-background-clip:text;-webkit-text-fill-color:transparent;
              font-size:18px;font-weight:900;letter-spacing:-0.02em;">釧路ナイトビジョン</div>
            <div style="color:#6b7280;font-size:11px;margin-top:2px;">KUSHIRO NIGHT VISION</div>
          </div>
        </td></tr>

        <!-- メイン本文 -->
        <tr><td style="background:#16213e;border:1px solid rgba(192,132,252,0.2);
          border-radius:20px;padding:32px 28px;">
          <h1 style="color:#f1f0f5;font-size:18px;font-weight:800;margin:0 0 20px;
            padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            ${title}
          </h1>
          <div style="color:#c4c2d4;font-size:14px;line-height:1.9;">
            ${body}
          </div>
          ${cta}
        </td></tr>

        <!-- フッター -->
        <tr><td style="text-align:center;padding-top:24px;">
          ${footerNote ? `<p style="color:#4b5563;font-size:12px;margin:0 0 8px;">${footerNote}</p>` : ""}
          <p style="color:#374151;font-size:11px;margin:0;line-height:1.8;">
            釧路ナイトビジョン &nbsp;|&nbsp;
            <a href="https://www.night-vision.jp" style="color:#7c3aed;text-decoration:none;">night-vision.jp</a>
            &nbsp;|&nbsp; info@night-vision.jp
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
