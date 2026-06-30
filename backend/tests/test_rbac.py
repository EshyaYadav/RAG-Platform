"""
RBAC regression tests. The most important test in this codebase: it proves
an EMPLOYEE query can never surface chunks from an HR-only or ADMIN-only
document. If this test ever fails after a refactor, treat it as a sev1 —
it means the security boundary in hybrid_search.py / vector_store.py has
regressed to a "retrieve-then-filter" pattern.
"""
import numpy as np
import pytest

from app.core.rbac import ROLE_RANK, allowed_visibilities, can_access


class TestAllowedVisibilities:
    def test_employee_sees_only_employee_and_public(self):
        assert set(allowed_visibilities("EMPLOYEE")) == {"EMPLOYEE", "PUBLIC"}

    def test_hr_sees_employee_hr_and_public(self):
        assert set(allowed_visibilities("HR")) == {"EMPLOYEE", "HR", "PUBLIC"}

    def test_admin_sees_everything(self):
        assert set(allowed_visibilities("ADMIN")) == {"EMPLOYEE", "HR", "ADMIN", "PUBLIC"}

    def test_employee_never_includes_hr_or_admin(self):
        allowed = allowed_visibilities("EMPLOYEE")
        assert "HR" not in allowed
        assert "ADMIN" not in allowed

    def test_hr_never_includes_admin(self):
        allowed = allowed_visibilities("HR")
        assert "ADMIN" not in allowed

    def test_unknown_role_raises(self):
        with pytest.raises(ValueError):
            allowed_visibilities("INTERN")


class TestCanAccess:
    def test_public_always_accessible(self):
        for role in ROLE_RANK:
            assert can_access(role, "PUBLIC") is True

    def test_employee_cannot_access_hr_doc(self):
        assert can_access("EMPLOYEE", "HR") is False

    def test_employee_cannot_access_admin_doc(self):
        assert can_access("EMPLOYEE", "ADMIN") is False

    def test_hr_cannot_access_admin_doc(self):
        assert can_access("HR", "ADMIN") is False

    def test_admin_can_access_everything(self):
        assert can_access("ADMIN", "EMPLOYEE") is True
        assert can_access("ADMIN", "HR") is True
        assert can_access("ADMIN", "ADMIN") is True

    def test_hr_can_access_own_and_below(self):
        assert can_access("HR", "EMPLOYEE") is True
        assert can_access("HR", "HR") is True


class TestVectorStoreFiltering:
    """
    Proves the RBAC filter is enforced INSIDE the vector store's search()
    method itself (not by a caller filtering results afterward) — this is
    the specific regression the spec calls out as the critical security
    rule: filter-then-retrieve, never retrieve-then-filter.
    """

    def test_search_excludes_disallowed_visibility(self, tmp_path):
        from app.services.vector_store import NumpyVectorStore

        store = NumpyVectorStore(index_path=str(tmp_path))

        dim = 384
        rng = np.random.default_rng(42)

        # Add one PUBLIC, one HR-only, one ADMIN-only chunk, all with
        # vectors very close to the query so a leak would be obvious.
        query_vec = rng.standard_normal(dim).astype(np.float32)
        query_vec /= np.linalg.norm(query_vec)

        store.add("chunk-public", query_vec.copy(), "PUBLIC")
        store.add("chunk-hr", query_vec.copy(), "HR")
        store.add("chunk-admin", query_vec.copy(), "ADMIN")

        # An EMPLOYEE searching should only ever get the PUBLIC chunk back,
        # even though the HR and ADMIN chunks are maximally similar.
        results = store.search(
            query_vec, allowed_visibilities=allowed_visibilities("EMPLOYEE"), top_k=10
        )
        result_ids = {cid for cid, _ in results}

        assert result_ids == {"chunk-public"}
        assert "chunk-hr" not in result_ids
        assert "chunk-admin" not in result_ids

    def test_hr_search_excludes_admin_only(self, tmp_path):
        from app.services.vector_store import NumpyVectorStore

        store = NumpyVectorStore(index_path=str(tmp_path))
        dim = 384
        rng = np.random.default_rng(7)
        query_vec = rng.standard_normal(dim).astype(np.float32)
        query_vec /= np.linalg.norm(query_vec)

        store.add("chunk-hr", query_vec.copy(), "HR")
        store.add("chunk-admin", query_vec.copy(), "ADMIN")

        results = store.search(
            query_vec, allowed_visibilities=allowed_visibilities("HR"), top_k=10
        )
        result_ids = {cid for cid, _ in results}

        assert "chunk-hr" in result_ids
        assert "chunk-admin" not in result_ids
