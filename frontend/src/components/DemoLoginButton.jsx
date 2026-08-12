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
      className="group w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-left transition-all duration-150 hover:border-[var(--primary)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
          Login as {role.charAt(0) + role.slice(1).toLowerCase()}
        </span>
        <span className="text-[var(--primary)] transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{ROLE_DESCRIPTIONS[role]}</p>
    </button>
  );
}
