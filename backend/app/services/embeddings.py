"""
Bypassed embedding generation to avoid local PyTorch/torch.dll execution
which gets blocked by strict Windows Device Guard policies.
Returns dummy numpy arrays of 384 dimensions.
"""
import numpy as np

def embed_texts(texts: list[str]) -> np.ndarray:
    """Returns an (N, 384) float32 numpy array filled with zeros to bypass torch block."""
    # Har ek text ke liye 384 dimensions ka dummy array bana rahe hain
    count = len(texts)
    dummy_embeddings = np.zeros((count, 384), dtype=np.float32)
    return dummy_embeddings

def embed_query(query: str) -> np.ndarray:
    """Convenience wrapper for embedding a single query string."""
    return embed_texts([query])[0]