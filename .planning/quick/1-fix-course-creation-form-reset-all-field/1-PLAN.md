---
phase: quick-fix
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - landing-next/components/course/CourseForm.tsx
  - landing-next/app/create/config/page.tsx
autonomous: true
requirements: [QUICK-1]

must_haves:
  truths:
    - "Navigating to /create always shows an empty form with no leftover data from previous courses"
    - "Step 2 (/create/config) still loads the data saved by step 1 during the same creation flow"
    - "Creating a second course after the first does not carry over any fields from the first course"
  artifacts:
    - path: "landing-next/components/course/CourseForm.tsx"
      provides: "Course form that resets localStorage on mount"
  key_links:
    - from: "landing-next/components/course/CourseForm.tsx"
      to: "localStorage courseData"
      via: "removeItem on mount before loading"
      pattern: "localStorage\\.removeItem"
---

<objective>
Fix the course creation form so that all fields are empty every time the user opens /create.

Purpose: Currently the form persists data from the previous course via localStorage. When a user wants to create a new course, they see stale data from the last one. The form should always start fresh.

Output: Modified CourseForm.tsx that clears localStorage on mount, ensuring a blank form every time.
</objective>

<execution_context>
@C:/Users/boede/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/boede/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@landing-next/components/course/CourseForm.tsx
@landing-next/app/create/config/page.tsx
@landing-next/types/course.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clear localStorage on CourseForm mount so form always starts empty</name>
  <files>landing-next/components/course/CourseForm.tsx</files>
  <action>
In CourseForm.tsx, modify the useEffect on mount (lines 21-32) to REMOVE the localStorage item instead of loading it. The form should always initialize with `defaultCourseData` (which is already the initial state on line 14).

Replace the current useEffect logic:
```
useEffect(() => {
  // Always start fresh - clear any leftover data from previous course creation
  localStorage.removeItem(STORAGE_KEY);
  setIsMounted(true);
}, []);
```

This ensures:
- Every visit to /create starts with a completely empty form (defaultCourseData)
- The saveToStorage callback still works — as the user fills in fields, data is saved to localStorage for step 2 to pick up
- Step 2 (/create/config) still reads from localStorage as before, so the flow between steps is preserved
- After a course is created and the user returns to /create, all fields are blank

Do NOT touch the saveToStorage callback or any other update functions — they must continue writing to localStorage so step 2 works.
  </action>
  <verify>
    <automated>cd C:/Users/boede/projects/courseflow/landing-next && npx next lint --file components/course/CourseForm.tsx 2>&1 | head -20</automated>
    <manual>Open /create in the browser, verify all fields are empty. Fill form, go to step 2, go back to step 1 — fields should be empty again.</manual>
  </verify>
  <done>CourseForm always initializes with empty fields (defaultCourseData). No localStorage data is loaded on mount. The saveToStorage mechanism still works for passing data to step 2.</done>
</task>

</tasks>

<verification>
1. `npx next lint` passes with no errors in modified file
2. Manual: Navigate to /create — all fields empty
3. Manual: Fill form, proceed to /create/config — data appears correctly in step 2
4. Manual: Navigate back to /create — all fields empty again (not pre-filled)
5. Manual: Create a full course, then go to /create again — completely blank form
</verification>

<success_criteria>
- /create always shows empty form fields regardless of previous localStorage state
- The 2-step flow (/create -> /create/config) still works correctly within a single creation session
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-course-creation-form-reset-all-field/1-SUMMARY.md`
</output>
