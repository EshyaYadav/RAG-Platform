const ROLE_STYLES = {
  ADMIN: "bg-rose-100 text-rose-700 border-rose-300",
  HR: "bg-amber-100 text-amber-700 border-amber-300",
  EMPLOYEE: "bg-blue-100 text-blue-700 border-blue-300",
};

export default function RoleBadge({ role }) {
  const style = ROLE_STYLES[role] || "bg-slate-100 text-slate-700 border-slate-300";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}
    >
      {role}
    </span>
  );
}
