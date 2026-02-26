"use client";

export function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
    >
      <span className="material-symbols-outlined text-base">logout</span>
      <span>התנתק</span>
    </button>
  );
}
