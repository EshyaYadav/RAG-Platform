"""
Tests for the hybrid search building blocks: Reciprocal Rank Fusion and
BM25 sparse search. (Full end-to-end hybrid_search() is async and DB +
model-dependent — covered indirectly via the RBAC tests on the vector
store, which is the security-critical half of this module.)
"""
from app.services.bm25_index import bm25_search
from app.services.hybrid_search import reciprocal_rank_fusion


class TestReciprocalRankFusion:
    def test_single_list_preserves_order(self):
        ranked = [[("a", 0.9), ("b", 0.5), ("c", 0.1)]]
        fused = reciprocal_rank_fusion(ranked, k=60, top_n=10)
        assert fused == ["a", "b", "c"]

    def test_agreement_boosts_rank(self):
        # "b" is ranked #1 in both lists despite "a" being #1 in list 1 only
        # -> "b" should win after fusion due to consistent agreement.
        dense = [("a", 0.99), ("b", 0.9), ("c", 0.1)]
        sparse = [("b", 5.0), ("c", 4.0), ("a", 0.1)]
        fused = reciprocal_rank_fusion([dense, sparse], k=60, top_n=10)
        assert fused[0] == "b"

    def test_respects_top_n(self):
        dense = [(str(i), 1.0 - i * 0.01) for i in range(20)]
        fused = reciprocal_rank_fusion([dense], k=60, top_n=5)
        assert len(fused) == 5

    def test_empty_lists_return_empty(self):
        assert reciprocal_rank_fusion([[], []], top_n=10) == []

    def test_disjoint_lists_includes_both(self):
        dense = [("a", 0.9)]
        sparse = [("b", 5.0)]
        fused = reciprocal_rank_fusion([dense, sparse], top_n=10)
        assert set(fused) == {"a", "b"}


class TestBM25Search:
    def test_finds_relevant_chunk(self):
        candidates = [
            ("1", "the salary policy outlines compensation bands for engineers"),
            ("2", "office hours are nine to six monday through friday"),
            ("3", "remote work requires manager approval for three days a week"),
        ]
        results = bm25_search("salary compensation bands", candidates, top_k=5)
        assert len(results) > 0
        assert results[0][0] == "1"

    def test_empty_candidates_returns_empty(self):
        assert bm25_search("anything", [], top_k=5) == []

    def test_respects_top_k(self):
        candidates = [(str(i), f"document number {i} about topic alpha") for i in range(10)]
        results = bm25_search("topic alpha", candidates, top_k=3)
        assert len(results) <= 3

    def test_irrelevant_query_returns_no_zero_scores(self):
        candidates = [("1", "completely unrelated content about gardening")]
        results = bm25_search("quantum physics nuclear reactors", candidates, top_k=5)
        # bm25_search filters out zero/negative scores, so a totally
        # unrelated query against unrelated text should yield nothing.
        assert results == []
