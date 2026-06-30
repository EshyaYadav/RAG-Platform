-- Run automatically by the postgres container on first boot (see docker-compose.yml).
-- Only relevant if you're using the optional pgvector-backed setup.
CREATE EXTENSION IF NOT EXISTS vector;
