"""
Storage abstraction so swapping local disk for S3 later is just writing one
new adapter class — nothing else in the codebase (ingestion, upload
endpoint) needs to change.
"""
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from app.config import settings


class StorageBackend(ABC):
    @abstractmethod
    def save(self, filename: str, content: bytes) -> str:
        """Persist content, return a storage_path/key that get()/delete() can use."""

    @abstractmethod
    def get(self, storage_path: str) -> bytes:
        """Retrieve raw bytes for a previously saved file."""

    @abstractmethod
    def delete(self, storage_path: str) -> None:
        """Remove a previously saved file. No-op if it doesn't exist."""


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_path: str | None = None):
        self.base_path = Path(base_path or settings.LOCAL_STORAGE_PATH)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, content: bytes) -> str:
        safe_name = f"{uuid.uuid4().hex}_{Path(filename).name}"
        full_path = self.base_path / safe_name
        with open(full_path, "wb") as f:
            f.write(content)
        return str(full_path)

    def get(self, storage_path: str) -> bytes:
        with open(storage_path, "rb") as f:
            return f.read()

    def delete(self, storage_path: str) -> None:
        try:
            os.remove(storage_path)
        except FileNotFoundError:
            pass


# Future S3 adapter sketch (not implemented — needs no AWS account for this
# project to run, included only to show the swap point):
#
# class S3StorageBackend(StorageBackend):
#     def __init__(self, bucket: str):
#         import boto3
#         self.s3 = boto3.client("s3")
#         self.bucket = bucket
#
#     def save(self, filename, content) -> str:
#         key = f"{uuid.uuid4().hex}_{filename}"
#         self.s3.put_object(Bucket=self.bucket, Key=key, Body=content)
#         return key
#
#     def get(self, storage_path) -> bytes:
#         obj = self.s3.get_object(Bucket=self.bucket, Key=storage_path)
#         return obj["Body"].read()
#
#     def delete(self, storage_path) -> None:
#         self.s3.delete_object(Bucket=self.bucket, Key=storage_path)


def get_storage_backend() -> StorageBackend:
    if settings.STORAGE_BACKEND == "local":
        return LocalStorageBackend()
    raise ValueError(f"Unsupported STORAGE_BACKEND: {settings.STORAGE_BACKEND}")
