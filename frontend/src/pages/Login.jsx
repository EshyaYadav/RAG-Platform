import { useState } from "react";
import client from "../api/client";
import DemoLoginButton from "../components/DemoLoginButton";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white text-xl font-bold mb-4">
            R
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Enterprise RAG Platform</h1>
          <p className="text-slate-500 mt-1">Privacy-first, role-based document search</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Demo Login</h2>
          <div className="space-y-2">
            <DemoLoginButton role="ADMIN" onClick={handleDemoLogin} loading={loading} />
            <DemoLoginButton role="HR" onClick={handleDemoLogin} loading={loading} />
            <DemoLoginButton role="EMPLOYEE" onClick={handleDemoLogin} loading={loading} />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">OR LOG IN MANUALLY</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white font-medium py-2.5 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Demo accounts: admin@demo.com / hr@demo.com / employee@demo.com — password "demo1234"
        </p>
      </div>
    </div>
  );
}
