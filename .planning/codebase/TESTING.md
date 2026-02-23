# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Not detected - No test runner configured (Jest, Vitest, etc.)
- No test files found in codebase
- `package.json` contains no test scripts

**Assertion Library:**
- Not applicable - No testing infrastructure present

**Run Commands:**
- No test commands available
- Current scripts in `package.json`:
  - `npm run dev` - Development server
  - `npm run build` - Production build
  - `npm run start` - Production start
  - `npm run lint` - ESLint linting only

## Test File Organization

**Location:**
- No test files detected in codebase
- Searched for `*.test.*` and `*.spec.*` patterns - none found
- 32 TypeScript source files; 0 test files

**Naming Convention:**
- Not established - No tests present

**Structure:**
- Would follow Next.js convention: `__tests__/` or co-located `*.test.ts` files
- No fixtures or test helpers directory

## Test Structure

**Suite Organization:**
- Not applicable - No tests currently exist

**Patterns:**
- Setup: Not established
- Teardown: Not established
- Assertion: Not established

## Mocking

**Framework:**
- Not applicable - No test framework configured

**Patterns:**
- Not established

**What to Mock (Inferred from code structure):**
- External APIs: Gemini image generation (expensive, should mock)
- Fetch calls: Apps Script URLs, logo fetches
- localStorage: Browser API in tests
- File system: `fs/promises` in Node.js tests

**What NOT to Mock (Inferred from code structure):**
- Core business logic: Landing ID generation, color extraction
- Utility functions: Color calculations, hex validation
- Type definitions

## Fixtures and Factories

**Test Data:**
- Not applicable - No test framework

**Location:**
- Would go in: `c:\Users\boede\projects\courseflow\landing-next\__tests__\fixtures\`
- Or co-located with tests: `c:\Users\boede\projects\courseflow\landing-next\app\api\banner\route.test.ts`

**Suggested Fixtures:**
From existing default data in `c:\Users\boede\projects\courseflow\landing-next\types\course.ts`:
```typescript
export const mockCourseData: CourseData = {
  course_details: {
    title: "Test Course",
    description: "Test Description",
    duration: "6 מפגשים",
    target_audience: "Test Audience",
    schedule: {
      dates: "2026-03-01 - 2026-04-01",
      days: "ראשון, שלישי",
      time: "18:00-20:00",
    },
    location: "זום",
  },
  // ... defaults from defaultCourseData
};
```

## Coverage

**Requirements:**
- Not enforced - No coverage tooling configured

**View Coverage:**
- Not applicable - Would use Jest/Vitest coverage reports when testing is added

## Test Types

**Unit Tests:**
- Recommended scope: Utility functions
- Examples to test:
  - `c:\Users\boede\projects\courseflow\landing-next\lib\colors.ts`:
    - `adjustColor()` - Color manipulation logic
    - `getContrastColor()` - Luminance calculations
    - `normalizeHex()` - Validation logic
  - `c:\Users\boede\projects\courseflow\landing-next\lib\auth.ts`:
    - `createSessionToken()` - Token generation
    - `verifySessionToken()` - Token verification
    - Session payload serialization/deserialization

**Integration Tests:**
- Recommended scope: API routes with mocked external services
- Examples to test:
  - `c:\Users\boede\projects\courseflow\landing-next\app\api\banner\route.ts`:
    - Banner generation flow (with mocked Gemini)
    - Image extraction from response
    - Color extraction from image (with mocked Vibrant)
  - `c:\Users\boede\projects\courseflow\landing-next\app\api\create-landing\route.ts`:
    - Landing creation with file system mocking
    - Apps Script sheet creation with fetch mocking
  - `c:\Users\boede\projects\courseflow\landing-next\app\api\register\route.ts`:
    - Form data forwarding with proper error handling

**E2E Tests:**
- Not configured - Would use Playwright or Cypress
- Recommended scenarios:
  - Full course creation flow: Fill form → Generate banner → Create landing → Preview
  - Registration flow: Load landing page → Fill registration form → Submit
  - Navbar/authentication flows in new auth routes

## Common Patterns (Inferred from Code)

**Async Testing:**
Current code heavily uses async/await. When testing is added:
```typescript
// Recommended pattern for async functions
test('should generate banner', async () => {
  const banner = await generateBannerImage(mockClient, mockCourse);
  expect(banner).toBeInstanceOf(Uint8Array);
});
```

**Error Testing:**
Patterns in code show error handling that should be tested:
```typescript
// From c:\Users\boede\projects\courseflow\landing-next\app\api\banner\route.ts
// Should test: Missing GEMINI_API_KEY
// Should test: Invalid JSON body
// Should test: Missing 'course' in request

// Recommended pattern:
test('should return 400 for missing course', async () => {
  const response = await POST(new Request('...', {
    method: 'POST',
    body: JSON.stringify({})
  }));
  const data = await response.json();
  expect(response.status).toBe(400);
  expect(data.ok).toBe(false);
  expect(data.error).toContain('course');
});
```

**Component Testing:**
For `c:\Users\boede\projects\courseflow\landing-next\components\course\CourseForm.tsx`:
- Test form submission with validation
- Test banner generation trigger
- Test localStorage persistence
- Test error state display

```typescript
// Recommended pattern with React Testing Library
test('should validate form before submission', async () => {
  render(<CourseForm />);
  const submitButton = screen.getByText('הבא: הגדרות דף נחיתה');

  fireEvent.click(submitButton);

  // Should show validation error
  expect(screen.getByText(/שם הקורס הוא שדה חובה/)).toBeInTheDocument();
});
```

## Current Testing Gaps

**Critical Untested Areas:**
1. `c:\Users\boede\projects\courseflow\landing-next\lib\auth.ts` - Session token creation/verification (security-critical)
2. `c:\Users\boede\projects\courseflow\landing-next\app\api\banner\route.ts` - Gemini integration and image extraction
3. `c:\Users\boede\projects\courseflow\landing-next\app\api\create-landing\route.ts` - Landing creation and file persistence
4. `c:\Users\boede\projects\courseflow\landing-next\components\course\CourseForm.tsx` - Form validation and state management
5. `c:\Users\boede\projects\courseflow\landing-next\lib\colors.ts` - Color utility functions (used throughout app)

**Risk:** No test coverage means:
- Regressions can occur silently
- Auth vulnerabilities could be introduced
- API contract changes might break clients
- Form validation rules might break

## Recommended Setup

**Phase 1: Add test infrastructure**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest ts-jest
```

**Phase 2: Create jest.config.js**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

**Phase 3: Add test scripts to package.json**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

*Testing analysis: 2026-02-23*
