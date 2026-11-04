import { toolAccess } from "@/lib/admin-auth";
import { createQrSvg } from "@/lib/poster-pdf";
import {
  DEFAULT_QR_COLORS,
  hexColor,
  MAX_QR_TEXT,
  parsePosterQr,
  TRANSPARENT,
} from "@/lib/qr-styles";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: Request) {
  if (!(await toolAccess("misc.qr")))
    return Response.json({ error: "Forbidden." }, { status: 403, headers });
  const params = new URL(request.url).searchParams;
  const text = params.get("text") ?? "";
  const qr = parsePosterQr(params);
  const ink = hexColor(params.get("ink") ?? DEFAULT_QR_COLORS.ink);
  const bgRaw = params.get("bg") ?? DEFAULT_QR_COLORS.bg;
  const bg = bgRaw === TRANSPARENT ? TRANSPARENT : hexColor(bgRaw);
  if (!text.trim() || text.length > MAX_QR_TEXT || !qr || !ink || !bg)
    return Response.json(
      {
        error: `Give some text, up to ${MAX_QR_TEXT} characters, and #rrggbb colors.`,
      },
      { status: 400, headers },
    );
  let svg: string;
  try {
    svg = await createQrSvg(text, qr, { ink, bg });
  } catch {
    return Response.json(
      { error: "That text is too long for a QR code." },
      { status: 400, headers },
    );
  }
  return new Response(svg, {
    headers: {
      ...headers,
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="metagame-qr.svg"`,
    },
  });
}
