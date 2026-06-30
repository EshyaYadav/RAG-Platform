"""
Role hierarchy and the single source of truth for "what can this role see".

This module is the security boundary of the whole system: every retrieval
path MUST call allowed_visibilities() and filter on its result BEFORE
running similarity search — never retrieve-then-filter. See
services/hybrid_search.py and tests/test_rbac.py.
"""
ROLE_RANK: dict[str, int] = {
    "EMPLOYEE": 0,
    "HR": 1,
    "ADMIN": 2,
}


def allowed_visibilities(user_role: str) -> list[str]:
    """
    Returns the list of Document/Chunk `visibility` values a user holding
    `user_role` is allowed to retrieve.

    A document tagged with role X is visible to any user whose role rank is
    >= rank(X) — i.e. visibility acts as a minimum-role gate, not an exact
    match. PUBLIC is always included regardless of role.

    Example: HR (rank 1) can see PUBLIC, EMPLOYEE, and HR docs, but not
    ADMIN docs.
    """
    if user_role not in ROLE_RANK:
        raise ValueError(f"Unknown role: {user_role}")

    user_rank = ROLE_RANK[user_role]
    visible = [role for role, rank in ROLE_RANK.items() if rank <= user_rank]
    visible.append("PUBLIC")
    return visible


def can_access(user_role: str, doc_visibility: str) -> bool:
    """Single-document check, used e.g. when fetching one Document by id
    directly (not via search) to enforce the same boundary."""
    if doc_visibility == "PUBLIC":
        return True
    if doc_visibility not in ROLE_RANK:
        return False
    return ROLE_RANK[user_role] >= ROLE_RANK[doc_visibility]
