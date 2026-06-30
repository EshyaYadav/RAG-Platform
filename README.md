# Enterprise RAG Platform (Privacy-First, Role-Based)

A self-hosted, zero-budget RAG (Retrieval-Augmented Generation) platform with
**role-based access control enforced at the retrieval layer** — not after the
fact. Employees, HR, and Admins each see only the documents their role is
permitted to see, and that filter is baked into the database query itself,
before reranking and before any text reaches the LLM.

## Architecture

```
User Login -> JWT (role claim) -> React Frontend
   |
   v
Upload PDF/DOCX/TXT + visibility tag --------------------> FastAPI /documents/upload
   |                                                              |
   |                                                   Save file (StorageBackend)
   |                                                   Create Document row (PROCESSING)
   |                                                   BackgroundTask -> Ingestion Pipeline
   |                                                              |
   |                                          Parse -> Chunk (1000/200) -> Embed (bge-small)
   |                                                              |
   |                                          Store chunks + vectors + visibility in DB
   |                                                   Document status -> READY
   v
Chat question -> FastAPI /chat/ask (JWT decoded -> role)
   |
   v
 RBAC FILTER COMPUTED FIRST (allowed_visibilities(role))
   |
   +--> Dense search (cosine similarity), restricted to visibility IN allowed
   +--> Sparse search (BM25), over the SAME allowed-only chunk set
   |
   v
 Reciprocal Rank Fusion (top 10) -> Cross-Encoder Rerank (top 5)
   |
   v
 Prompt: "Answer ONLY from context. If absent, say you don't know."
   |
   v
 Groq LLM (llama-3.3-70b-versatile) -> Answer + cited sources -> Frontend
```

**Security invariant:** every retrieval code path filters by
`visibility IN allowed_visibilities(user_role)` *before* running similarity
search — never retrieve-then-filter. This is enforced in
`app/services/hybrid_search.py` and covered by a regression test in
`tests/test_rbac.py`.

Role hierarchy: `EMPLOYEE (0) < HR (1) < ADMIN (2)`, plus a special `PUBLIC`
tier visible to everyone regardless of role.

## A note on this build's environment

This project was generated in a sandboxed environment **without Docker,
without a live Postgres server, and without outbound access to the Groq
API**, so two components were adapted versus the original Docker+pgvector
spec while keeping the architecture and security model identical:

| Component | Original spec | What's actually built here | Why |
|---|---|---|---|
| Vector DB | PostgreSQL + pgvector via Docker | **SQLite** (via SQLAlchemy, async) for metadata + a **local numpy-based vector index** (`app/services/vector_store.py`) for embeddings | No Docker/Postgres available in the build sandbox. The vector store is behind an interface so swapping to pgvector is a one-file change — see "Swapping back to pgvector" below. |
| LLM | Groq API | Groq API (unchanged) | Just needs `GROQ_API_KEY` set as an environment variable at runtime — the build process itself never contacts Groq. |
| Embeddings | bge-small-en-v1.5 (sentence-transformers, local) | Unchanged | Fully local, free, no API needed. |
| Reranker | cross-encoder/ms-marco-MiniLM-L-6-v2 | Unchanged | Fully local. |
| Background jobs | FastAPI BackgroundTasks | Unchanged | |
| Containerization | docker-compose | A working `docker-compose.yml` is still included for a Docker-enabled machine — it just wasn't used to build/test here, and currently targets the pgvector path which needs `PgVectorStore` implemented (see below). |

Everything else — auth, RBAC, chunking, hybrid search logic, RRF, prompt
guardrails, frontend — is implemented exactly to spec and is real, runnable
code with no stubs in the core logic.

### Swapping back to pgvector

`app/services/vector_store.py` defines a `VectorStore` interface with
`add()`, `search(query_vector, allowed_visibilities, top_k)`, and `delete()`.
The default implementation (`NumpyVectorStore`) keeps vectors in a flat numpy
array persisted to disk as a `.npy` file alongside a small id/visibility
index. To move to pgvector: implement a `PgVectorStore` class with the same
interface backed by `Chunk.embedding.cosine_distance(...)` (a SQL sketch is
included as a comment at the bottom of that file), point `config.py` at it
via `VECTOR_BACKEND=pgvector`, and nothing else in the codebase changes.

## Folder structure

```
enterprise-rag-platform/
├── docker-compose.yml          (optional — requires Docker + PgVectorStore)
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── run.sh                  (single command: seed + start backend)
│   ├── migrations/init.sql
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/ (user.py, document.py, chunk.py)
│   │   ├── schemas/ (auth.py, document.py, chat.py)
│   │   ├── core/ (security.py, rbac.py, rate_limit_note.md)
│   │   ├── services/ (storage.py, ingestion.py, embeddings.py,
│   │   │              vector_store.py, bm25_index.py, hybrid_search.py,
│   │   │              reranker.py, llm.py)
│   │   ├── api/ (auth.py, documents.py, chat.py)
│   │   └── seed.py
│   └── tests/ (test_rbac.py, test_hybrid_search.py)
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── index.html
    ├── tailwind.config.js
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── api/client.js
        ├── pages/ (Login.jsx, Dashboard.jsx, Upload.jsx, Chat.jsx)
        └── components/ (DemoLoginButton.jsx, SourceCitation.jsx, RoleBadge.jsx)
```

## Setup & run (any laptop, no Docker needed)

### 1. Get a free Groq API key
Sign up at https://console.groq.com (free tier) and create an API key.

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env
# Edit ../.env and set GROQ_API_KEY=your_key_here

python -m app.seed                # creates demo users + sample documents
uvicorn app.main:app --reload --port 8000
```

Backend will be live at `http://localhost:8000`. Interactive API docs at
`http://localhost:8000/docs`. First run will download the embedding and
reranker models (~150MB total, one-time, fully free/local).

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be live at `http://localhost:5173`.

### 4. Demo flow

1. Open `http://localhost:5173`.
2. Click "Login as Employee" / "Login as HR" / "Login as Admin".
3. Go to Upload, drag in a PDF/DOCX/TXT, tag it with a visibility level.
4. Wait for status to flip to READY (polls automatically every 2s).
5. Go to Chat, ask a question. Watch the role badge in the header and the
   source citations under each answer — try the same question logged in as
   different roles to see the RBAC filter in action (an Employee asking
   about an HR-only doc gets "I don't know," not a leaked answer).

### Demo accounts (created by `seed.py`)

| Email | Password | Role |
|---|---|---|
| admin@demo.com | demo1234 | ADMIN |
| hr@demo.com | demo1234 | HR |
| employee@demo.com | demo1234 | EMPLOYEE |

`/auth/demo-login/{role}` also issues a JWT with no password, but only when
`DEMO_MODE=true` in `.env` — disable this before any real deployment.

## Running with Docker (optional)

The included `docker-compose.yml` spins up a Postgres+pgvector container and
targets that backend by default. The app code ships with SQLite + numpy as
the default, working configuration. To actually use Docker's Postgres, first
implement `PgVectorStore` (see "Swapping back to pgvector" above), then:

```bash
cp .env.example .env   # fill in GROQ_API_KEY etc.
docker-compose up --build
```

## Known limitations

- **Vector index is in-memory/numpy, not pgvector** in the default
  configuration — fine for a demo or up to a few hundred thousand chunks, but
  pgvector (or a real ANN index) is recommended before production scale. The
  interface is designed so this swap is isolated to one file.
- **BM25 index is rebuilt per request** from the role-filtered chunk set
  rather than maintained as a persistent inverted index — simple and
  correct, but not optimal at high document-count scale.
- **JWT stored in React state**, not localStorage, by design (avoids XSS
  token theft) — but that also means a page refresh logs the user out. Fine
  for a demo; production would want httpOnly cookies + refresh tokens.
- **No rate limiting middleware is wired in by default** — see
  `backend/app/core/rate_limit_note.md` for where to add `slowapi` before any
  public deployment.
- **File size/type validation** is enforced server-side (10MB max, PDF/DOCX/TXT
  only) but there's no virus scanning — don't expose this directly to the
  public internet without adding one (e.g. ClamAV).
- **No streaming responses** from the LLM yet — `/chat/ask` returns the full
  answer in one response rather than token-by-token streaming.
- **Single-tenant.** No org/workspace isolation — all users share one
  document pool, partitioned only by role visibility; the `department`
  metadata field is stored but not yet used as an additional filter.
- This was built and verified for **code correctness and local runnability**
  in a sandbox without live Groq API access — the LLM call itself has not
  been executed end-to-end by the build process. Test it yourself once you
  add a real `GROQ_API_KEY`.

## Free deployment path (when you're ready)

- **Frontend:** Vercel — set `VITE_API_URL` env var to your backend's public URL.
- **Backend:** Render or Railway free web service, using `backend/Dockerfile`.
  Set `GROQ_API_KEY` and other `.env` vars in their dashboard's secrets
  manager, never in code.
- **Vector DB at scale:** Neon (free Postgres tier with pgvector support)
  once you've implemented `PgVectorStore`.
