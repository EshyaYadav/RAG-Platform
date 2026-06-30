import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_URL,
});

// JWT is injected per-request from whatever the caller currently has in
// memory (App.jsx holds it in React state) — intentionally NOT read from
// localStorage. See README/App.jsx comment for why.
let currentToken = null;

export function setAuthToken(token) {
  currentToken = token;
}

client.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

export default client;
