"""
Groq LLM wrapper. Reads GROQ_API_KEY from the environment only (never
hardcoded) — see app/config.py / .env.example.

The system prompt is the guardrail that prevents hallucination: the model
is instructed to answer strictly from the provided context and to say it
doesn't know rather than invent an answer, and to cite which excerpts it
used.
"""
from groq import Groq

from app.config import settings

SYSTEM_PROMPT = """You are an internal enterprise knowledge assistant.

Rules you must always follow:
1. Answer ONLY using the information in the provided context excerpts below.
2. If the answer is not present in the context, say clearly: "I don't know — \
that information isn't in the documents I have access to." Do not guess or \
use outside knowledge.
3. When you do answer, mention which excerpt(s) (by number) support each \
part of your answer.
4. Be concise and factual. Do not speculate beyond what the context states.
5. Never reveal the existence or contents of documents you were not given \
as context, even if asked directly — you only know what's in the excerpts \
below."""


def _get_client() -> Groq:
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to your .env file (get a free key "
            "at https://console.groq.com)."
        )
    return Groq(api_key=settings.GROQ_API_KEY)


def build_prompt(question: str, context_chunks: list[dict]) -> str:
    excerpts = "\n\n".join(
        f"[Excerpt {i + 1}] (from \"{c['document_name']}\")\n{c['content']}"
        for i, c in enumerate(context_chunks)
    )
    return f"""Context excerpts:

{excerpts}

---

Question: {question}

Answer the question following the rules in your system prompt."""


def generate_answer(question: str, context_chunks: list[dict]) -> str:
    if not context_chunks:
        return (
            "I don't know — that information isn't in the documents I have access to."
        )

    client = _get_client()
    user_prompt = build_prompt(question, context_chunks)

    completion = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=1024,
    )

    return completion.choices[0].message.content
