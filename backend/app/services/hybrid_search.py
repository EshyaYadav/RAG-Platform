"""
The retrieval core of the system, and the single place the RBAC security
invariant is enforced end-to-end:

    RBAC FILTER IS COMPUTED FIRST. Every retrieval code path below only
    ever touches chunks whose visibility is in allowed_visibilities(role).
    There is no "retrieve everything, filter after" path anywhere in this
    file — see tests/test_rbac.py for the regression test that guards this.

Flow: allowed_visibilities -> (dense search + sparse search, both already
role-filtered) -> Reciprocal Rank Fusion -> cross-encoder rerank -> top_k.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import allowed_visibilities
from app.models.chunk import Chunk
from app.services.bm25_index import bm25_search
from app.services.embeddings import embed_query
from app.services.reranker import cross_encoder_rerank
from app.services.vector_store import get_vector_store


def reciprocal_rank_fusion(
    ranked_lists: list[list[tuple[str, float]]], k: int = 60, top_n: int = 10
) -> list[str]:
    """
    Standard RRF: score(doc) = sum over lists of 1 / (k + rank_in_list).
    Takes multiple (chunk_id, score) ranked lists and returns a single
    fused ranking of chunk_ids, ignoring the raw scores (rank position is
    what matters for RRF, not the magnitude — this is what makes it safe to
    combine dense cosine similarity with BM25 scores, which are on
    completely different scales).
    """
    fused_scores: dict[str, float] = {}
    for ranked_list in ranked_lists:
        for rank, (chunk_id, _score) in enumerate(ranked_list):
            fused_scores[chunk_id] = fused_scores.get(chunk_id, 0.0) + 1.0 / (k + rank + 1)

    sorted_ids = sorted(fused_scores.keys(), key=lambda cid: fused_scores[cid], reverse=True)
    return sorted_ids[:top_n]


async def hybrid_search(
    query: str, user_role: str, db: AsyncSession, top_k: int = 5
) -> list[dict]:
    """
    Returns a list of dicts: {chunk_id, document_id, document_name, content,
    score} for the top_k most relevant, role-permitted chunks.
    """
    # --- Step 0: RBAC FILTER COMPUTED FIRST. Nothing below this line
    # touches the DB or vector index without restricting to `allowed`. ---
    allowed = allowed_visibilities(user_role)

    # --- Step 1: DENSE search. The vector store's search() method takes
    # `allowed` and applies the filter internally before computing
    # similarity scores — see vector_store.py. ---
    query_vector = embed_query(query)
    vector_store = get_vector_store()
    dense_results = vector_store.search(query_vector, allowed_visibilities=allowed, top_k=20)
    # dense_results: [(chunk_id, cosine_score), ...]

    # --- Step 2: SPARSE search, over the SAME role-filtered candidate pool.
    # We fetch chunk text restricted to `allowed` directly in the SQL WHERE
    # clause — this is the security boundary for the sparse path. ---
    result = await db.execute(select(Chunk).where(Chunk.visibility.in_(allowed)))
    allowed_chunks = result.scalars().all()
    candidate_pool = [(c.id, c.content) for c in allowed_chunks]

    sparse_results = bm25_search(query, candidate_pool, top_k=20)
    # sparse_results: [(chunk_id, bm25_score), ...]

    if not dense_results and not sparse_results:
        return []

    # --- Step 3: fuse with Reciprocal Rank Fusion ---
    fused_ids = reciprocal_rank_fusion([dense_results, sparse_results], k=60, top_n=10)

    # Look up full chunk rows for the fused candidates (still implicitly
    # role-safe, since fused_ids can only contain ids that came from the
    # already-filtered dense/sparse results above).
    if not fused_ids:
        return []
    result = await db.execute(select(Chunk).where(Chunk.id.in_(fused_ids)))
    fused_chunks = {c.id: c for c in result.scalars().all()}

    rerank_candidates = [
        (cid, fused_chunks[cid].content) for cid in fused_ids if cid in fused_chunks
    ]

    # --- Step 4: cross-encoder rerank for final precision ---
    reranked = cross_encoder_rerank(query, rerank_candidates, top_n=top_k)

    output = []
    for chunk_id, score in reranked:
        chunk = fused_chunks[chunk_id]
        output.append(
            {
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_name": chunk.document_name,
                "content": chunk.content,
                "score": score,
            }
        )
    return output
