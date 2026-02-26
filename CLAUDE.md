# CourseFlow - Project Instructions

## מטרת הפרויקט
כלי ליצירת פלאיירים ודפי נחיתה בעברית לאגף הנוער בירושלים.
מדריכים ורכזים יוצרים פלאייר מקצועי תוך 5 דקות ללא ידע גרפי,
עם דף נחיתה אוטומטי לרישום ומעקב נרשמים.

## חשבונות - חשוב!
- כל השירותים על חשבון העמותה: `makeai12555@gmail.com`
- Vercel, GitHub, Google Sheets - הכל על החשבון הזה בלבד

## Gemini Image Model
- Use `gemini-3-pro-image-preview`
- API key חדש מחובר לחשבון העמותה, billing בתהליך הגדרה
- This model handles Hebrew RTL text well

## Project Structure
- Next.js app in `landing-next/`
- 2-step flow: `/create` → `/create/config` → `/l/[id]`
- Banner generation via Gemini API at `/api/banner`
- Landing data stored as JSON files in `data/landings/`
- Auth via `proxy.ts` (Next.js 16, NOT middleware.ts)
- Session management in `lib/auth.ts` using Web Crypto API
- Login via Google Apps Script backend (`AUTH_SCRIPT_URL`)
- User management via Google Sheets (username/password)

## Environment
- `.env.local` contains all secrets
- `GEMINI_IMAGE_MODEL` controls banner model

## MCP Servers
- **Vercel** (`https://mcp.vercel.com`) - HTTP type, working
  - Team: `makeai12555's projects` (ID: `team_fV9hFBKyNKPZ78grlw5KIAeO`)
  - Projects: `courseflow-landing`, `youth-marketing`
- **Supabase** - built-in integration, working
- **Google Drive** (`@modelcontextprotocol/server-gdrive`) - stdio type
  - OAuth credentials in `.gdrive-server-credentials.json` (gitignored)
  - Client secret file: `client_secret_174076691452-*.json` (gitignored)
  - Provides MCP **resources** (file access), not tools
  - To re-auth: `npx -y @modelcontextprotocol/server-gdrive auth` with env vars set

## פיצ'רים בתור (לפי עדיפות)
1. middleware להגנה על נתיבים - מפנה לא מאומתים ל-/login
2. אימות מדריכים עם מייל וסיסמא
3. עריכת תמונת רקע בשפה חופשית אחרי יצירה
4. Google Sheets נפרד לכל קורס אוטומטית
5. שליחת Google Forms למדריכים בסיום קורס
6. פריסה ב-Vercel + URL לפרסום

## Deployment
- Vercel team: `makeai12555s-projects`
- App responds on `localhost:3000` (redirects to `/login` when unauthenticated)

## Important
- RTL Hebrew text support is critical in all UI
- Do NOT downgrade the Gemini model
- Old Python code in `_old_python/` is deprecated, ignore it
- JSON landing files are the database - no external DB
- Credential files (`client_secret_*.json`, `.gdrive-server-credentials.json`) are gitignored