// POST /api/register - Proxy registration to Apps Script
export async function POST(req: Request) {
  const base = process.env.APPS_SCRIPT_URL;
  if (!base) {
    return Response.json({ success: false, error: "APPS_SCRIPT_URL missing" }, { status: 500 });
  }

  try {
    const body = await req.json();

    // Forward to Apps Script with action: "register"
    const response = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register",
        ...body,
      }),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Registration proxy error:", error);
    return Response.json({ success: false, error: "Failed to register" }, { status: 500 });
  }
}
