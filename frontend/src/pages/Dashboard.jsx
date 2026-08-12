import { NavLink, Outlet } from "react-router-dom";
import RoleBadge from "../components/RoleBadge";

function ThemeToggle({ theme, onToggleTheme }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={onToggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--primary)]"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <path d="M20 15.2A7.5 7.5 0 0 1 8.8 4a7.8 7.8 0 1 0 11.2 11.2Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export default function Dashboard({ user, onLogout, theme, onToggleTheme }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <aside className="flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] p-3">
        <div className="mb-3 flex items-center gap-2 rounded-xl px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
            R
          </div>
          <span className="text-sm font-semibold text-[var(--sidebar-foreground)]">Enterprise RAG</span>
        </div>

        <nav className="flex-1 space-y-1 px-1 py-2">
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm" : "text-[var(--sidebar-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`
            }
          >
            💬 Chat
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm" : "text-[var(--sidebar-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`
            }
          >
            📤 Upload
          </NavLink>
        </nav>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold text-[var(--foreground)]">
              {user.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[var(--foreground)]">{user.email}</p>
              <div className="mt-1">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <span>Sign out</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
              <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--background)]">
        <div className="flex items-center justify-end border-b border-[var(--border)] bg-[var(--background)] px-5 py-3">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
