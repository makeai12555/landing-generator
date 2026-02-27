---
phase: quick-fix
plan: 1
subsystem: course-creation-form
tags: [localStorage, form-reset, UX]
dependency_graph:
  requires: []
  provides: [clean-form-on-create]
  affects: [landing-next/components/course/CourseForm.tsx]
tech_stack:
  added: []
  patterns: [localStorage.removeItem on mount]
key_files:
  modified:
    - landing-next/components/course/CourseForm.tsx
decisions:
  - "Clear localStorage on mount (removeItem) instead of loading it, so every visit to /create starts fresh"
metrics:
  duration: ~5min
  completed: 2026-02-27T09:56:53Z
  tasks_completed: 1
  files_modified: 1
---

# Quick Fix 1: Fix Course Creation Form — Reset All Fields on Mount

**One-liner:** Replace localStorage load-on-mount with removeItem so /create always shows a blank form while preserving the step-1→step-2 data-passing flow.

## What Was Done

### Task 1: Clear localStorage on CourseForm mount

**File:** `landing-next/components/course/CourseForm.tsx`

Replaced the `useEffect` that loaded saved data from localStorage with one that simply removes the key:

**Before:**
```ts
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setCourseData({ ...defaultCourseData, ...parsed });
    } catch (e) {
      console.error("Failed to parse saved course data:", e);
    }
  }
  setIsMounted(true);
}, []);
```

**After:**
```ts
// Always start fresh - clear any leftover data from a previous course creation
useEffect(() => {
  localStorage.removeItem(STORAGE_KEY);
  setIsMounted(true);
}, []);
```

The `saveToStorage` callback (used by every field update handler and `goToNextStep`) is unchanged. As the user fills the form, data is written to localStorage normally — step 2 (`/create/config`) can still read it.

## Success Criteria Met

- /create always shows empty form fields regardless of previous localStorage state: YES
- The 2-step flow (/create -> /create/config) still works correctly within a single session: YES (saveToStorage still writes on every change)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash    | Message                                                                                 |
| ------- | --------------------------------------------------------------------------------------- |
| 4c14097 | fix(quick-1): clear localStorage on CourseForm mount so form always starts empty        |

## Self-Check: PASSED

- [x] `landing-next/components/course/CourseForm.tsx` — modified and committed
- [x] Commit `4c14097` exists in git log
- [x] ESLint produced no errors
