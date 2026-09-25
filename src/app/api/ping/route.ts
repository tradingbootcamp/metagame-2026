// PING on the scrabble rack: the smallest possible round trip to the site.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
