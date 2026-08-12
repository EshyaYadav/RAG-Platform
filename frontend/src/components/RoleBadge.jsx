const ROLE_STYLES = {
  ADMIN: {
    backgroundColor: "rgba(202, 50, 20, 0.1)",
    color: "var(--destructive)",
    borderColor: "rgba(202, 50, 20, 0.35)",
  },
  HR: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    color: "var(--chart-4)",
    borderColor: "rgba(245, 158, 11, 0.34)",
  },
  EMPLOYEE: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    color: "var(--chart-2)",
    borderColor: "rgba(59, 130, 246, 0.32)",
  },
};

export default function RoleBadge({ role }) {
  const style = ROLE_STYLES[role] || {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
    borderColor: "var(--border)",
  };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={style}
    >
      {role}
    </span>
  );
}
