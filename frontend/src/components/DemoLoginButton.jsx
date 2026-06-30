const ROLE_DESCRIPTIONS = {
  EMPLOYEE: "Sees public + employee-level documents",
  HR: "Sees public, employee, and HR-level documents",
  ADMIN: "Sees everything, including confidential documents",
};

export default function DemoLoginButton({ role, onClick, loading }) {
  return (
    <button
      onClick={() => onClick(role)}
      disabled={loading}
      className="w-full text-left px-5 py-4 rounded-xl border border-slate-200 bg-white
                 hover:border-brand-400 hover:shadow-md transition-all duration-150
                 disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 group-hover:text-brand-700">
          Login as {role.charAt(0) + role.slice(1).toLowerCase()}
        </span>
        <span className="text-brand-600 group-hover:translate-x-1 transition-transform">
          &rarr;
        </span>
      </div>
      <p className="text-sm text-slate-500 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
    </button>
  );
}
