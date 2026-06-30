"""
Sparse/keyword search via rank_bm25 (pure Python, free, no Elasticsearch).

BM25 is built fresh per query over the chunks passed in — and crucially the
caller (hybrid_search.py) is responsible for only ever passing in a
role-filtered candidate set. This module does no DB access of its own, so
it can never accidentally search un-filtered data — there's simply no path
for it to fetch chunks itself.
"""
from rank_bm25 import BM25Okapi


def _tokenize(text: str) -> list[str]:
    return text.lower().split()


def bm25_search(
    query: str, candidates: list[tuple[str, str]], top_k: int
) -> list[tuple[str, float]]:
    """
    candidates: list of (chunk_id, chunk_text) — already role-filtered by
    the caller.
    Returns: [(chunk_id, bm25_score), ...] sorted descending, length <= top_k.
    """
    if not candidates:
        return []

    corpus = [_tokenize(text) for _, text in candidates]
    bm25 = BM25Okapi(corpus)

    scores = bm25.get_scores(_tokenize(query))

    scored = list(zip([cid for cid, _ in candidates], scores))
    scored.sort(key=lambda pair: pair[1], reverse=True)

    return [(cid, float(score)) for cid, score in scored[:top_k] if score > 0]
