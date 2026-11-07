import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { toolAccess } from "@/lib/admin-auth";
import { questsByIds } from "@/lib/megagame-store";
import { formatTicketCode } from "@/lib/ticket-code-format";
import { isUuid } from "../../../megagame/uuid";

export const runtime = "nodejs";
export const maxDuration = 60;

const FIT_TIMEOUT_MS = 30_000;

/**
 * The print page as a PDF: headless Chromium loads /backstage/quests/print
 * with the same query string and this request's cookies, waits for CardFit,
 * and prints it. Vercel runs @sparticuz/chromium's build; locally the one
 * `playwright install` fetched.
 */
export async function GET(request: Request) {
  if (!(await toolAccess("megagame.manage")))
    return new Response("Sign in required.", { status: 401 });

  const url = new URL(request.url);
  const origin = requestOrigin(request, url);
  const target = `${origin}/backstage/quests/print${url.search}`;
  const filename = await pdfName(url.searchParams.getAll("id"));

  const serverless = !!(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  );
  const browser = await playwright.launch(
    serverless
      ? {
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        }
      : { headless: true },
  );
  try {
    const context = await browser.newContext();
    const cookies = parseCookies(request.headers.get("cookie"), origin);
    if (cookies.length > 0) await context.addCookies(cookies);
    const page = await context.newPage();
    await page.emulateMedia({ media: "print" });
    await page.goto(target, { waitUntil: "load" });
    await page.waitForSelector("html[data-fit-done]", {
      timeout: FIT_TIMEOUT_MS,
      state: "attached",
    });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } finally {
    await browser.close();
  }
}

/** The origin the browser reached, so the headless page hits this deployment. */
function requestOrigin(request: Request, url: URL): string {
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function parseCookies(header: string | null, origin: string) {
  if (!header) return [];
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      const name = eq === -1 ? part : part.slice(0, eq);
      const value = eq === -1 ? "" : part.slice(eq + 1);
      return { name, value, url: origin };
    });
}

/** `<code>.pdf` for one chosen quest, else quests.pdf. */
async function pdfName(ids: string[]): Promise<string> {
  const unique = [...new Set(ids.filter(isUuid))];
  if (unique.length !== 1) return "quests.pdf";
  const [quest] = await questsByIds(unique);
  return quest ? `${formatTicketCode(quest.code)}.pdf` : "quests.pdf";
}
