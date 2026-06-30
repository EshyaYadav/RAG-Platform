# Rate limiting (not wired in by default)

For a demo/interview project this is intentionally left out to keep the
dependency list minimal, but before any public deployment, add `slowapi`
(a free, open-source rate limiter built on `limits`):

```bash
pip install slowapi
```

In `app/main.py`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Then decorate sensitive endpoints, e.g. in `app/api/auth.py`:

```python
@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    ...
```

Recommended limits for this project:
- `/auth/login` — 5/minute per IP (brute-force protection)
- `/documents/upload` — 10/minute per user (abuse/storage exhaustion protection)
- `/chat/ask` — 20/minute per user (protects your free Groq quota)
