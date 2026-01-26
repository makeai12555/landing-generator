# Plan: Run CourseFlow Application

## Overview
To test the full workflow, we need to run **two services**:
1. **Flask Backend** (Python) - serves the course creation UI and banner generation API
2. **Next.js Frontend** - serves the modern landing pages

## Steps

### 1. Install Python Dependencies
The Flask app requires these packages:
- `flask`
- `google-genai`
- `Pillow`
- `colorthief`
- `python-dotenv`
- `Wand` (optional, for SVG support)

```bash
pip install flask google-genai Pillow colorthief python-dotenv
```

### 2. Install Next.js Dependencies
```bash
cd landing-next
npm install
```

### 3. Run Flask Backend (Terminal 1)
```bash
python app.py
```
- Runs on: `http://localhost:5000`
- Main UI: `http://localhost:5000/create`

### 4. Run Next.js Frontend (Terminal 2)
```bash
cd landing-next
npm run dev
```
- Runs on: `http://localhost:3000`

## Workflow to Test

1. **Create Course**: Go to `http://localhost:5000/create`
2. **Generate Banner**: Fill the form and generate a banner with AI
3. **Create Landing Page**: Configure and generate a landing page
4. **View Landing Page**: The landing page will be served from Next.js at `http://localhost:3000`

## Environment Variables
Already configured in `.env`:
- `GEMINI_API_KEY` ✓
- `APPS_SCRIPT_URL` ✓
