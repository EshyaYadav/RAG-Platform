"""
Vector store abstraction. This is the file you'd touch to swap from the
default local numpy index to real pgvector — everything else in the
codebase (hybrid_search.py, ingestion.py) only talks to this interface.

The default NumpyVectorStore keeps all vectors in one in-memory float32
matrix, persisted to disk as a .npy file plus a parallel id/visibility
sidecar (json), and reloaded at startup. This is fine for a demo / up to a
few hundred thousand chunks; see README "Known limitations" for when to
graduate to a real ANN index.
"""
import json
import threading
from abc import ABC, abstractmethod
from pathlib import Path

import numpy as np

from app.config import settings


class VectorStore(ABC):
    @abstractmethod
    def add(self, chunk_id: str, vector: np.ndarray, visibility: str) -> None:
        ...

    @abstractmethod
    def search(
        self, query_vector: np.ndarray, allowed_visibilities: list[str], top_k: int
    ) -> list[tuple[str, float]]:
        """Returns [(chunk_id, similarity_score), ...] sorted descending by
        score, restricted to chunks whose visibility is in
        `allowed_visibilities`. The visibility filter MUST be applied here,
        inside the store, not by the caller after the fact."""

    @abstractmethod
    def delete(self, chunk_id: str) -> None:
        ...


class NumpyVectorStore(VectorStore):
    def __init__(self, index_path: str | None = None):
        self.index_path = Path(index_path or settings.VECTOR_INDEX_PATH)
        self.index_path.mkdir(parents=True, exist_ok=True)
        self._vectors_file = self.index_path / "vectors.npy"
        self._meta_file = self.index_path / "meta.json"
        self._lock = threading.Lock()

        self._ids: list[str] = []
        self._visibilities: list[str] = []
        self._vectors: np.ndarray = np.zeros((0, settings.EMBEDDING_DIM), dtype=np.float32)

        self._load()

    def _load(self) -> None:
        if self._meta_file.exists() and self._vectors_file.exists():
            with open(self._meta_file) as f:
                meta = json.load(f)
            self._ids = meta["ids"]
            self._visibilities = meta["visibilities"]
            self._vectors = np.load(self._vectors_file)

    def _persist(self) -> None:
        np.save(self._vectors_file, self._vectors)
        with open(self._meta_file, "w") as f:
            json.dump({"ids": self._ids, "visibilities": self._visibilities}, f)

    def add(self, chunk_id: str, vector: np.ndarray, visibility: str) -> None:
        with self._lock:
            self._ids.append(chunk_id)
            self._visibilities.append(visibility)
            vector = vector.reshape(1, -1).astype(np.float32)
            self._vectors = (
                vector if self._vectors.shape[0] == 0 else np.vstack([self._vectors, vector])
            )
            self._persist()

    def add_batch(self, chunk_ids: list[str], vectors: np.ndarray, visibility: str) -> None:
        """Bulk insert — used by ingestion to avoid re-persisting to disk
        once per chunk."""
        with self._lock:
            self._ids.extend(chunk_ids)
            self._visibilities.extend([visibility] * len(chunk_ids))
            vectors = vectors.astype(np.float32)
            self._vectors = (
                vectors if self._vectors.shape[0] == 0 else np.vstack([self._vectors, vectors])
            )
            self._persist()

    def search(
        self, query_vector: np.ndarray, allowed_visibilities: list[str], top_k: int
    ) -> list[tuple[str, float]]:
        with self._lock:
            if self._vectors.shape[0] == 0:
                return []

            # --- RBAC FILTER FIRST: build a boolean mask of allowed rows
            # before any similarity computation touches the data. ---
            allowed_set = set(allowed_visibilities)
            mask = np.array([v in allowed_set for v in self._visibilities], dtype=bool)
            if not mask.any():
                return []

            candidate_vectors = self._vectors[mask]
            candidate_ids = [cid for cid, m in zip(self._ids, mask) if m]

            # Vectors are L2-normalized at embed time, so dot product ==
            # cosine similarity.
            scores = candidate_vectors @ query_vector.astype(np.float32)

            top_n = min(top_k, len(candidate_ids))
            top_indices = np.argpartition(-scores, top_n - 1)[:top_n]
            top_indices = top_indices[np.argsort(-scores[top_indices])]

            return [(candidate_ids[i], float(scores[i])) for i in top_indices]

    def delete(self, chunk_id: str) -> None:
        with self._lock:
            if chunk_id not in self._ids:
                return
            idx = self._ids.index(chunk_id)
            self._ids.pop(idx)
            self._visibilities.pop(idx)
            self._vectors = np.delete(self._vectors, idx, axis=0)
            self._persist()


_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        if settings.VECTOR_BACKEND == "numpy":
            _store = NumpyVectorStore()
        else:
            raise ValueError(
                f"VECTOR_BACKEND={settings.VECTOR_BACKEND!r} is not implemented in this "
                f"build. See the PgVectorStore sketch at the bottom of this file."
            )
    return _store


# ---------------------------------------------------------------------------
# PgVectorStore sketch (NOT implemented — no Postgres available in the build
# sandbox). Implement this class to swap the numpy backend for real pgvector
# at scale; it must satisfy the same VectorStore interface above so nothing
# else in the codebase changes.
# ---------------------------------------------------------------------------
#
# class PgVectorStore(VectorStore):
#     """Vectors live directly on Chunk.embedding (pgvector column,
#     dim=384). Add a migration: ALTER TABLE chunks ADD COLUMN embedding
#     vector(384); and CREATE EXTENSION IF NOT EXISTS vector;"""
#
#     def __init__(self, session_factory):
#         self.session_factory = session_factory
#
#     async def search(self, query_vector, allowed_visibilities, top_k):
#         async with self.session_factory() as db:
#             stmt = (
#                 select(Chunk)
#                 .where(Chunk.visibility.in_(allowed_visibilities))  # RBAC FIRST
#                 .order_by(Chunk.embedding.cosine_distance(query_vector))
#                 .limit(top_k)
#             )
#             rows = (await db.execute(stmt)).scalars().all()
#             return [(row.id, 1 - row.embedding.cosine_distance(query_vector)) for row in rows]
