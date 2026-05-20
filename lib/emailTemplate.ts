const OWL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="48" height="48">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0828"/>
      <stop offset="100%" style="stop-color:#08080f"/>
    </linearGradient>
    <linearGradient id="body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b9d"/>
      <stop offset="100%" style="stop-color:#a855f7"/>
    </linearGradient>
    <linearGradient id="eye" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffd700"/>
      <stop offset="100%" style="stop-color:#ff9900"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="0.8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#bg)"/>
  <ellipse cx="16" cy="22" rx="8" ry="8" fill="url(#body)" opacity="0.2"/>
  <ellipse cx="16" cy="15" rx="8" ry="7.5" fill="#0f0f1a"/>
  <ellipse cx="16" cy="15" rx="7.5" ry="7" fill="none" stroke="url(#body)" stroke-width="1"/>
  <path d="M10 9 L8 4 L12 8Z" fill="url(#body)"/>
  <path d="M22 9 L24 4 L20 8Z" fill="url(#body)"/>
  <circle cx="12.5" cy="14.5" r="3.5" fill="#0a0a14"/>
  <circle cx="12.5" cy="14.5" r="3.2" fill="none" stroke="url(#eye)" stroke-width="0.8" filter="url(#glow)"/>
  <circle cx="12.5" cy="14.5" r="2" fill="url(#eye)" opacity="0.9" filter="url(#glow)"/>
  <circle cx="12.5" cy="14.5" r="1.1" fill="#0a0a14"/>
  <circle cx="13.2" cy="13.8" r="0.5" fill="#fff" opacity="0.9"/>
  <circle cx="19.5" cy="14.5" r="3.5" fill="#0a0a14"/>
  <circle cx="19.5" cy="14.5" r="3.2" fill="none" stroke="url(#eye)" stroke-width="0.8" filter="url(#glow)"/>
  <circle cx="19.5" cy="14.5" r="2" fill="url(#eye)" opacity="0.9" filter="url(#glow)"/>
  <circle cx="19.5" cy="14.5" r="1.1" fill="#0a0a14"/>
  <circle cx="20.2" cy="13.8" r="0.5" fill="#fff" opacity="0.9"/>
  <path d="M14.8 18.5 L16 20.5 L17.2 18.5Z" fill="#ffd700" opacity="0.8"/>
  <circle cx="5" cy="5" r="0.7" fill="#ffd700" opacity="0.7" filter="url(#glow)"/>
  <circle cx="27" cy="4" r="0.5" fill="#a855f7" opacity="0.8" filter="url(#glow)"/>
  <circle cx="28" cy="10" r="0.4" fill="#ff6b9d" opacity="0.6"/>
</svg>`;

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
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${ctaUrl}"
        style="display:inline-block;
          background:linear-gradient(135deg,#a855f7,#ff6b9d);
          color:#ffffff;font-weight:800;font-size:14px;padding:13px 32px;
          border-radius:30px;text-decoration:none;letter-spacing:0.06em;
          box-shadow:0 0 24px rgba(168,85,247,0.5);">
        ${ctaText} →
      </a>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#08080f;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#08080f;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#08080f;padding:40px 0;">
    <tr><td align="center" style="padding:0 16px;">
      <table width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0" border="0">

        <!-- ロゴヘッダー -->
        <tr><td style="text-align:center;padding-bottom:24px;">
          <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;background:linear-gradient(135deg,#12022a,#0d0d1a);border:1px solid rgba(168,85,247,0.25);border-radius:20px;padding:20px 36px;">
            <tr><td style="text-align:center;">
              ${OWL_SVG}
              <div style="margin-top:10px;font-size:17px;font-weight:900;letter-spacing:-0.01em;">
                <span style="background:linear-gradient(135deg,#ff6b9d,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#ff6b9d;">釧路ナイトビジョン</span>
              </div>
              <div style="color:#4b4466;font-size:10px;margin-top:3px;letter-spacing:0.18em;">KUSHIRO NIGHT VISION</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- メインカード -->
        <tr><td style="background:#0f0f1a;border:1px solid rgba(168,85,247,0.18);border-radius:20px;padding:32px 28px;">

          <!-- タイトル -->
          <div style="font-size:17px;font-weight:800;color:#f0eeff;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.07);">
            ${title}
          </div>

          <!-- 本文 -->
          <div style="color:#c0bdd8;font-size:14px;line-height:1.9;">
            ${body}
          </div>

          ${cta}
        </td></tr>

        <!-- フッター -->
        <tr><td style="text-align:center;padding:24px 0 8px;">
          ${footerNote ? `<p style="color:#3b3555;font-size:12px;margin:0 0 10px;">${footerNote}</p>` : ""}
          <p style="color:#2e2a44;font-size:11px;margin:0;line-height:2;">
            釧路ナイトビジョン &nbsp;·&nbsp;
            <a href="https://www.night-vision.jp" style="color:#6d28d9;text-decoration:none;">night-vision.jp</a>
            &nbsp;·&nbsp; info@night-vision.jp
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
