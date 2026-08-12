import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { setAuthToken } from "./api/client";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";

// IMPORTANT: the JWT is held only in React state (in-memory), never in
// localStorage or sessionStorage. This avoids XSS-based token theft, at
// the cost of logging the user out on a full page refresh — an acceptable
// tradeoff for a demo. A production app would instead use httpOnly cookies
// issued by the backend.
export default function App() {
  const [user, setUser] = useState(null); // { email, role, full_name }
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function handleLogin(authResponse) {
    setAuthToken(authResponse.access_token);
    setUser({
      email: authResponse.email,
      role: authResponse.role,
      full_name: authResponse.full_name,
    });
  }

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route element={<Dashboard user={user} onLogout={handleLogout} theme={theme} onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))} />}>
        <Route path="/chat" element={<Chat user={user} />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}
