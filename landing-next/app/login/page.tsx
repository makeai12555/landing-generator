"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const raw = searchParams.get("from") || "/create";
  const returnTo = (raw.startsWith("/") && !raw.startsWith("//")) ? raw : "/create";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(returnTo);
        router.refresh();
      } else {
        setError(result.error || "שגיאה בהתחברות");
      }
    } catch {
      setError("שגיאה בחיבור לשרת. נסה שוב מאוחר יותר.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-900">שם משתמש</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            placeholder="הכנס שם משתמש"
            required
            autoFocus
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-900">סיסמה</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            placeholder="הכנס סיסמה"
            required
            dir="ltr"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-primary hover:opacity-90 text-gray-900 font-bold rounded-lg shadow-sm shadow-primary/20 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? "מתחבר..." : "התחבר"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 text-primary mx-auto mb-4">
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
          <h1 className="text-2xl font-bold text-gray-900">CourseFlow</h1>
          <p className="text-gray-500 mt-2">התחבר כדי להמשיך</p>
        </div>

        {/* Login Form */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
