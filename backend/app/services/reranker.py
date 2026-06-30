"""
Bypassed reranker to avoid local CrossEncoder/Transformers execution.
Directly passes through chunks with dummy scores without loading heavy ML models.
"""

def cross_encoder_rerank(
    query: str, candidates: list[tuple[str, str]], top_n: int
) -> list[tuple[str, float]]:
    """
    candidates: list of (chunk_id, chunk_text).
    Returns: [(chunk_id, rerank_score), ...] sorted descending, length <= top_n.
    """
    if not candidates:
        return []

    # Har ek candidate ko dummy score (1.0, 0.9, 0.8...) dekar return kar rahe hain
    # Taaki aage ka search engine pipeline break na ho
    results = []
    for i, (chunk_id, _) in enumerate(candidates):
        dummy_score = 1.0 - (i * 0.01)
        results.append((chunk_id, float(dummy_score)))
        
    return results[:top_n]