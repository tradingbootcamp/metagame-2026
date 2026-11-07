import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { toolAccess } from "@/lib/admin-auth";
import { questsByIds } from "@/lib/megagame-store";
import { formatTicketCode } from "@/lib/ticket-code-format";
import { isUuid } from "../../../megagame/uuid";
import { OVERFLOW_HEADER } from "../overflow";

export const runtime = "nodejs";
export const maxDuration = 120;

const STEP_TIMEOUT_MS = 20_000;
const FIT_TIMEOUT_MS = 30_000;

// One unpack per instance: concurrent first requests would both write /tmp.
let serverlessExecutable: Promise<string> | undefined;

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
  const origin = url.origin;
  const target = `${origin}/backstage/quests/print${url.search}`;
  const filename = await pdfName(url.searchParams.getAll("id"));

  const serverless = !!(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  );
  const browser = await playwright.launch(
    serverless
      ? {
          args: chromium.args,
          executablePath: await (serverlessExecutable ??=
            chromium.executablePath()),
          headless: true,
        }
      : { headless: true },
  );
  try {
    const context = await browser.newContext();
    const cookies = parseCookies(request.headers.get("cookie"), origin);
    if (cookies.length > 0) await context.addCookies(cookies);
    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT_MS);
    await page.emulateMedia({ media: "print" });
    await page.goto(target, { waitUntil: "load" });
    const fitDone = await page
      .waitForSelector("html[data-fit-done]", {
        timeout: FIT_TIMEOUT_MS,
        state: "attached",
      })
      .then((html) => html.getAttribute("data-fit-done"))
      .catch(() => null);
    if (fitDone === null) {
      const signedIn = (await page.$("[data-card]")) !== null;
      return new Response(
        signedIn
          ? "The cards didn\u2019t finish laying out in time; try again."
          : "The PDF renderer couldn\u2019t sign in to the print page.",
        { status: 500 },
      );
    }
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
        ...(fitDone !== "ok" && { [OVERFLOW_HEADER]: fitDone }),
      },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return new Response(`PDF render failed: ${reason}`, { status: 500 });
  } finally {
    await browser.close();
  }
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
