// GET /api/landing/[id] - Fetch from Google Apps Script
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const base = process.env.APPS_SCRIPT_URL;
  if (!base) return new Response("APPS_SCRIPT_URL missing", { status: 500 });

  const url = new URL(base);
  url.searchParams.set("action", "getLanding");
  url.searchParams.set("id", id);

  const r = await fetch(url.toString(), { cache: "no-store" });
  const data = await r.json();

  if (!data?.success) return new Response("Not Found", { status: 404 });

  return Response.json(data.landing);
}
