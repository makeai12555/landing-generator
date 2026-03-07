# CourseFlow - Project Instructions

## מטרת הפרויקט
כלי ליצירת פלאיירים ודפי נחיתה בעברית לאגף הנוער בירושלים.
מדריכים ורכזים יוצרים פלאייר מקצועי תוך 5 דקות ללא ידע גרפי,
עם דף נחיתה אוטומטי לרישום ומעקב נרשמים.
הדף נפרס אוטומטית בורסל והמדריכים מקבלים URL לפרסום הדף ולינק ל-Google Sheets שנפתח גם הוא אוטומטית לניהול הנרשמים.

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
  - To re-auth: `npx -y @modelcontextprotocol/server-gdrive auth` with env vars set

## פיצ'רים בתור (לפי עדיפות)
1. אימות מדריכים עם מייל וסיסמא
2. עריכת תמונת רקע בשפה חופשית אחרי יצירה
3. Google Sheets נפרד לכל קורס אוטומטית
4. שליחת Google Forms למדריכים בסיום קורס
5. פריסה ב-Vercel + URL לפרסום

## Deployment
- Vercel team: `makeai12555s-projects`
- App responds on `localhost:3000` (redirects to `/login` when unauthenticated)

## Important
- RTL Hebrew text support is critical in all UI
- Do NOT downgrade the Gemini model
- Old Python code in `_old_python/` is deprecated, ignore it
- JSON landing files are the database - no external DB
- Credential files (`client_secret_*.json`, `.gdrive-server-credentials.json`) are gitignored

---

# MANDATORY: Post-Task Documentation (SR-PTD)

**CRITICAL: After completing ANY task that modifies files, you MUST invoke this skill:**

```
Skill tool -> skill: "sr-ptd-skill"
```

**This is NOT optional. Skipping this skill means the task is INCOMPLETE.**

When planning ANY development task, add as the FINAL item in your task list:
```
[ ] Create SR-PTD documentation
```

### Before Starting Any Task:
1. Create your task plan as usual
2. Add SR-PTD documentation as the last task item
3. This step is MANDATORY for: features, bug fixes, refactors, maintenance, research

### When Completing the SR-PTD Task:
1. Read `~/.claude/skills/sr-ptd-skill/SKILL.md` for full instructions
2. Choose template: Full (complex tasks) or Quick (simple tasks)
3. Create file: `SR-PTD_YYYY-MM-DD_[task-id]_[description].md`
4. Save to: `C:/projects/Skills/Dev_doc_for_skills`
5. Fill all applicable sections thoroughly

### Task Completion Criteria:
A task is NOT complete until SR-PTD documentation exists.

### If Conversation Continues After Task:
Update the existing SR-PTD document instead of creating a new one.

---
