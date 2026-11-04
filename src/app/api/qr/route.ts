import { toolAccess } from "@/lib/admin-auth";
import { createQrSvg } from "@/lib/poster-pdf";
import { MAX_QR_TEXT, parsePosterQr } from "@/lib/qr-styles";

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
  if (!text.trim() || text.length > MAX_QR_TEXT || !qr)
    return Response.json(
      { error: `Give some text, up to ${MAX_QR_TEXT} characters.` },
      { status: 400, headers },
    );
  let svg: string;
  try {
    svg = await createQrSvg(text, qr);
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
