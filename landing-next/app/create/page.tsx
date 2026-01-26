import { CourseForm } from "@/components/course";

export const metadata = {
  title: "יצירת קורס | CourseFlow",
  description: "צור קורס חדש עם דף נחיתה מותאם אישית",
};

export default function CreateCoursePage() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-gray-900">
            <div className="w-8 h-8 text-primary">
              <svg
                className="w-full h-full"
                fill="none"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight">CourseFlow</h2>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-10 max-w-4xl mx-auto">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-gray-900 text-lg font-bold">יצירת קורס חדש</p>
                <p className="text-gray-500 text-sm">שלב 1 מתוך 2: מידע בסיסי</p>
              </div>
              <span className="text-primary text-sm font-bold">50%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "50%" }} />
            </div>
          </div>
        </div>

        {/* Course Form */}
        <CourseForm />
      </main>
    </>
  );
}
