import { NavLink, Outlet } from "react-router-dom";
import RoleBadge from "../components/RoleBadge";

export default function Dashboard({ user, onLogout }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
              R
            </div>
            <span className="font-semibold text-slate-800 text-sm">Enterprise RAG</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            💬 Chat
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            📤 Upload
          </NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-slate-200 space-y-3">
          <div className="px-2">
            <p className="text-xs text-slate-400 mb-1">Logged in as</p>
            <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
            <div className="mt-2">
              <RoleBadge role={user.role} />
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left px-2 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
