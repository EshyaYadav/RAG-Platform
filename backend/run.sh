#!/usr/bin/env bash
# Single-command backend startup: seeds demo data (if not already present)
# then starts the dev server.
set -e

if [ ! -f "../.env" ]; then
  echo "No .env file found. Copying .env.example -> ../.env"
  cp ../.env.example ../.env
  echo "IMPORTANT: edit ../.env and set GROQ_API_KEY before chat will work."
fi

python -m app.seed
uvicorn app.main:app --reload --port 8000
