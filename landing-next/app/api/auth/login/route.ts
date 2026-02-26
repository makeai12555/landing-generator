import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "שם משתמש וסיסמה נדרשים" },
      { status: 400 }
    );
  }

  const appsScriptUrl = process.env.AUTH_SCRIPT_URL;
  if (!appsScriptUrl) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "authenticate", username, password }),
    });

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "שם משתמש או סיסמה שגויים" },
        { status: 401 }
      );
    }

    // Create signed session token
    const token = await createSessionToken(result.username || username);

    const res = NextResponse.json({ success: true, username: result.username });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "שגיאה בחיבור לשרת. נסה שוב מאוחר יותר." },
      { status: 500 }
    );
  }
}
