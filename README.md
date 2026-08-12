# RAG Platform — Role-Based Retrieval Augmented Generation

A self-hosted RAG app I built to solve a problem most "chat with your docs" demos
ignore: **access control**. In most RAG tutorials, every user can retrieve every
chunk in the vector store — which is fine for a toy project, but useless the
moment you want employees, HR, and admins to see different sets of documents.

This project bakes role-based visibility straight into the retrieval query, so
the filtering happens *before* similarity search runs, not as an afterthought
on top of the LLM's answer.

## Why I built it

I wanted to understand how far you could push a "zero infra cost" RAG stack —
no managed vector DB, no paid embedding API — while still keeping the security
model correct. Turns out you can get pretty far with SQLite, a flat numpy
array for vectors, and a free-tier LLM API, as long as the RBAC logic is
airtight.

## How retrieval works

```
Login (JWT with role claim)
        |
        v
Upload PDF/DOCX/TXT + visibility tag  -->  FastAPI saves file, kicks off
                                            background ingestion
        |
        v
Parse -> chunk (1000 chars, 200 overlap) -> embed with bge-small -> store
        |
        v
Ask a question  -->  decode JWT -> compute allowed_visibilities(role) FIRST
        |
        +--> dense search (cosine sim), restricted to allowed visibilities
        +--> sparse search (BM25), over the same allowed-only chunk set
        |
        v
Reciprocal Rank Fusion (top 10) -> cross-encoder rerank (top 5)
        |
        v
"Answer only from this context, say so if it's not there" -> Groq (Llama 3.3)
        |
        v
Answer + cited sources back to the frontend
```

Role hierarchy: `EMPLOYEE < HR < ADMIN`, plus a `PUBLIC` tier anyone can see
regardless of role. The rule I cared most about getting right: **every**
retrieval path filters by `visibility IN allowed_visibilities(role)` before
running similarity search — never retrieve-then-filter, since that leaks
scores/metadata even if you strip the text afterward. This lives in
`app/services/hybrid_search.py`, and `tests/test_rbac.py` is a regression
test that fails loudly if anyone touches that path carelessly.

## Stack

- **Backend:** FastAPI, SQLAlchemy (async) + SQLite for metadata, a small
  numpy-backed vector index for embeddings, BM25 (`rank-bm25`) for sparse
  search
- **Embeddings / reranking:** `bge-small-en-v1.5` and
  `cross-encoder/ms-marco-MiniLM-L-6-v2`, both local via sentence-transformers
  — no API cost
- **LLM:** Groq (`llama-3.3-70b-versatile`) — free tier, fast inference
- **Frontend:** React + Vite + Tailwind, JWT auth, role badges, source
  citations under each answer

Why SQLite + numpy instead of Postgres/pgvector? Mostly so anyone can clone
this and run it in five minutes without spinning up Docker or a database
server. The vector store sits behind a small interface
(`app/services/vector_store.py`) so swapping in pgvector later is a matter of
implementing one class, not rewriting the app — see below.

### Swapping in pgvector

`VectorStore` defines `add()`, `search(query_vector, allowed_visibilities, top_k)`,
and `delete()`. Implement a `PgVectorStore` against
`Chunk.embedding.cosine_distance(...)` (there's a SQL sketch as a comment at
the bottom of `vector_store.py`), point `config.py` at it with
`VECTOR_BACKEND=pgvector`, and nothing else changes.

## Project layout

```
RAG-Platform/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── run.sh                 # seed db + start server
│   ├── migrations/init.sql
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/             # user, document, chunk
│   │   ├── schemas/             # auth, document, chat
│   │   ├── core/                 # security, rbac
│   │   ├── services/             # storage, ingestion, embeddings,
│   │   │                         # vector_store, bm25_index,
│   │   │                         # hybrid_search, reranker, llm
│   │   ├── api/                  # auth, documents, chat
│   │   └── seed.py
│   └── tests/
└── frontend/
    └── src/
        ├── api/client.js
        ├── pages/            # Login, Dashboard, Upload, Chat
        └── components/       # DemoLoginButton, SourceCitation, RoleBadge
```

## Running it locally

You'll need a free Groq API key from [console.groq.com](https://console.groq.com).

**Backend**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env
# set GROQ_API_KEY in .env

python -m app.seed            # creates demo users + sample docs
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`. First run downloads the embedding
and reranker models (~150MB, one-time).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`.

**Try it out:** log in as Employee, HR, or Admin (demo buttons on the login
page), upload a doc and tag its visibility, then ask about it from a
different role's account. A lower-privilege role should get "I don't know"
instead of a leaked answer — that's the whole point of the project.

Demo accounts (from `seed.py`):

| Email | Password | Role |
|---|---|---|
| admin@demo.com | demo1234 | ADMIN |
| hr@demo.com | demo1234 | HR |
| employee@demo.com | demo1234 | EMPLOYEE |

`DEMO_MODE=true` in `.env` also enables passwordless demo login — turn this
off before deploying anywhere real.

## Docker

`docker-compose.yml` is set up for a Postgres+pgvector backend. The app
defaults to SQLite + numpy out of the box, so you'd need to implement
`PgVectorStore` (see above) before the Docker path is fully wired up.

```bash
cp .env.example .env
docker-compose up --build
```

## Things I haven't gotten to yet

- Vector search is numpy-in-memory, not a real ANN index — fine for a demo,
  won't scale past a few hundred thousand chunks without pgvector or similar
- BM25 index rebuilds per-request from the role-filtered chunk set rather
  than being maintained persistently
- JWT lives in React state, not localStorage (avoids XSS token theft, but
  means a refresh logs you out) — httpOnly cookies + refresh tokens would be
  the production move
- No rate limiting wired in yet (notes on adding `slowapi` in
  `backend/app/core/rate_limit_note.md`)
- File upload validation (10MB max, PDF/DOCX/TXT) is enforced but there's no
  virus scanning
- No token streaming — `/chat/ask` returns the full answer at once
- Single-tenant — no org/workspace isolation, just role-based visibility
  within one shared document pool

## Deploying

- **Frontend:** Vercel, with `VITE_API_URL` pointed at your backend
- **Backend:** Render or Railway, using `backend/Dockerfile`, secrets set in
  their dashboard rather than committed anywhere
- **Vector DB at scale:** Neon's free Postgres tier has pgvector support,
  once `PgVectorStore` is implemented

## License

See [LICENSE](LICENSE).
