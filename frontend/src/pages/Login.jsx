import { useState } from "react";
import client from "../api/client";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_14px_30px_rgba(37,99,235,0.38)] ring-8 ring-white/65">
      <span className="text-3xl font-extrabold leading-none tracking-[-0.08em]">R</span>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 3 5 6v5c0 4.7 3 8.9 7 10 4-1.1 7-5.3 7-10V6l-7-3Z" />
      <path d="M9.5 12.2 11.3 14l3.7-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20" />
      <circle cx="10" cy="8" r="3" />
      <path d="M20 20v-1a3.5 3.5 0 0 0-3-3.4" />
      <path d="M16.2 5.7a3 3 0 0 1 0 5.4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="M4 19h16" />
      <rect x="6" y="11" width="2.5" height="6" rx="1" />
      <rect x="10.75" y="8" width="2.5" height="9" rx="1" />
      <rect x="15.5" y="5" width="2.5" height="12" rx="1" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="m12 3 1.8 5.1L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.9L12 3Z" />
      <path d="M19.5 14.5 20 16l1.5.5-1.5.5-.5 1.5-.5-1.5L17.5 16l1.5-.5.5-1Z" />
    </svg>
  );
}

const ROLE_OPTIONS = [
  { role: "ADMIN", label: "Admin", desc: "See all documents", icon: ShieldIcon },
  { role: "HR", label: "HR", desc: "See all employee", icon: UsersIcon },
  { role: "EMPLOYEE", label: "Employee", desc: "See all documents", icon: UserIcon },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("ADMIN");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await client.post("/auth/login", { email, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(role) {
    setError("");
    setLoading(true);
    setSelectedRole(role);
    try {
      const res = await client.post(`/auth/demo-login/${role.toLowerCase()}`);
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 text-slate-900 sm:px-6 lg:px-10" style={{ background: "linear-gradient(135deg, #f3faf6 0%, #ecf7f3 48%, #f9fdfd 100%)" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 15% 20%, rgba(114, 227, 173, 0.22), transparent 0 22%), radial-gradient(circle at 88% 16%, rgba(210, 242, 230, 0.42), transparent 0 18%), radial-gradient(circle at 50% 88%, rgba(160, 222, 190, 0.14), transparent 0 24%)" }} />
        <svg className="absolute inset-0 h-full w-full opacity-[0.28]" viewBox="0 0 1440 920" fill="none" aria-hidden="true">
          <g stroke="rgba(145, 173, 164, 0.68)" strokeWidth="1">
            <path d="M60 90 180 40 290 110 410 70 510 140 630 92 760 160 890 100 1010 150 1150 82 1280 128" />
            <path d="M36 230 132 178 256 240 360 186 470 248 588 196 712 266 836 212 954 270 1084 208 1198 258 1370 196" />
            <path d="M100 390 210 332 332 408 448 344 572 410 694 348 816 418 936 350 1058 406 1180 340 1320 384" />
            <path d="M30 600 168 520 300 598 420 530 548 610 680 540 804 618 934 552 1064 624 1200 548 1376 612" />
            <path d="M84 798 208 730 334 806 468 736 594 812 722 742 850 814 976 744 1108 804 1236 734 1388 786" />
            <path d="M110 70 70 228 120 392 72 548 114 706 78 856" />
            <path d="M282 40 250 184 304 340 264 502 314 652 280 826" />
            <path d="M512 56 480 214 534 370 496 530 548 690 514 844" />
            <path d="M760 48 724 198 774 354 736 518 784 676 750 836" />
            <path d="M1012 40 980 192 1032 348 994 506 1048 666 1012 820" />
            <path d="M1268 52 1238 208 1288 360 1252 520 1298 682 1260 836" />
          </g>
          <g fill="#dfeee7" stroke="#bacdc7" strokeWidth="1.1">
            <circle cx="60" cy="90" r="3.5" />
            <circle cx="180" cy="40" r="4" />
            <circle cx="290" cy="110" r="3.5" />
            <circle cx="410" cy="70" r="4" />
            <circle cx="510" cy="140" r="3.5" />
            <circle cx="630" cy="92" r="4" />
            <circle cx="760" cy="160" r="3.5" />
            <circle cx="890" cy="100" r="4" />
            <circle cx="1010" cy="150" r="3.5" />
            <circle cx="1150" cy="82" r="4" />
            <circle cx="1280" cy="128" r="3.5" />
            <circle cx="72" cy="548" r="3.5" />
            <circle cx="314" cy="652" r="4" />
            <circle cx="548" cy="690" r="3.5" />
            <circle cx="784" cy="676" r="4" />
            <circle cx="1048" cy="666" r="3.5" />
            <circle cx="1298" cy="682" r="4" />
          </g>
        </svg>

        <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-white/45 blur-2xl" />
        <div className="absolute right-20 top-24 h-28 w-28 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-emerald-200/25 blur-3xl" />

        <div className="absolute left-3 top-20 hidden rounded-2xl border border-white/75 bg-white/65 px-2.5 py-2 shadow-[0_10px_30px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:flex">
          <ChartIcon />
        </div>
        <div className="absolute left-8 bottom-32 hidden rounded-2xl border border-white/75 bg-white/65 px-2.5 py-2 shadow-[0_10px_30px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:flex">
          <ChartIcon />
        </div>
        <div className="absolute right-8 top-28 hidden rounded-2xl border border-white/75 bg-white/65 px-2.5 py-2 shadow-[0_10px_30px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:flex">
          <SparkIcon />
        </div>
        <div className="absolute right-8 bottom-28 hidden rounded-2xl border border-white/75 bg-white/65 px-2.5 py-2 shadow-[0_10px_30px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:flex">
          <ChartIcon />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 xl:gap-16">
          <section className="max-w-2xl justify-self-start pt-2 lg:pt-0">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_30px_rgba(148,163,184,0.14)] backdrop-blur-xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eafaf3] text-[#1f9d6c]">
                <ShieldIcon />
              </span>
              Secure access for role-based knowledge search
            </div>

            <h1 className="max-w-xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-[4.1rem]">
              Private, Role-Based Knowledge Search
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
              Access your company&apos;s full documentation securely with Retrieval-Augmented Generation (RAG).
              Documents are indexed with granular role-based access control, ensuring privacy and compliance.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[linear-gradient(135deg,#74e1b0_0%,#5bd8a8_100%)] px-7 py-3.5 text-base font-semibold text-[#1e2723] shadow-[0_18px_36px_rgba(114,227,173,0.34)] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#72e3ad]/55"
              >
                <SearchIcon />
                Start a Search (After Login)
              </button>
              <p className="text-sm text-slate-500 sm:max-w-xs">
                Demo the secure retrieval flow with role-aware access controls.
              </p>
            </div>
          </section>

          <section className="justify-self-end lg:pt-2">
            <div className="relative mx-auto w-full max-w-[520px] rounded-[30px] border border-[rgba(117,201,164,0.4)] bg-white/72 p-4 shadow-[0_32px_90px_rgba(114,227,173,0.18)] backdrop-blur-2xl sm:p-5" style={{ background: "rgba(255,255,255,0.75)" }}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                <BrandMark />
              </div>

              <div className="rounded-[24px] border border-[#e4e7eb] bg-white/95 px-5 pb-5 pt-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-6 sm:pb-6 sm:pt-9">
                <div className="text-center">
                  <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-[1.75rem]">
                    Enterprise RAG Platform
                  </h2>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-3">
                  {ROLE_OPTIONS.map(({ role, label, desc, icon: Icon }) => {
                    const active = selectedRole === role;

                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleDemoLogin(role)}
                        className={`group rounded-2xl border px-2.5 py-4 text-center transition-all duration-200 sm:px-3 sm:py-4.5 ${
                          active
                            ? "border-[#72e3ad] bg-[linear-gradient(180deg,#f1fcf6_0%,#ffffff_100%)] text-slate-900 shadow-[0_14px_32px_rgba(114,227,173,0.2)]"
                            : "border-[#e4e7eb] bg-white text-slate-600 hover:-translate-y-0.5 hover:border-[#bfead3] hover:shadow-[0_12px_24px_rgba(148,163,184,0.16)]"
                        }`}
                        aria-pressed={active}
                      >
                        <span
                          className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${
                            active ? "bg-[#eafaf3] text-[#1e7b5d]" : "bg-[#f5f7f8] text-slate-500 group-hover:bg-[#eafaf3] group-hover:text-[#1e7b5d]"
                          }`}
                        >
                          <Icon />
                        </span>
                        <div className="text-sm font-semibold">{label}</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-xs">{desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200/80" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    OR LOG IN MANUALLY
                  </span>
                  <div className="h-px flex-1 bg-slate-200/80" />
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="h-11 w-full rounded-xl border border-[#dfe3e6] bg-[#f5f7f7] px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#72e3ad] focus:bg-white focus:ring-4 focus:ring-[#72e3ad]/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-[#dfe3e6] bg-[#f5f7f7] px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#72e3ad] focus:bg-white focus:ring-4 focus:ring-[#72e3ad]/15"
                    />
                  </div>
                  {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3faef0_0%,#1f9ad7_100%)] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(63,174,240,0.34)] transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <p className="mt-4 text-center text-[11px] leading-5 text-slate-500 sm:text-xs">
                  Demo accounts: admin@demo.com / hr@demo.com / employee@demo.com - password "demo1234"
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
