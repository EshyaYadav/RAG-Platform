import { useCallback, useEffect, useRef, useState } from "react";
import client from "../api/client";

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public", desc: "Visible to everyone" },
  { value: "EMPLOYEE", label: "Employee", desc: "Visible to Employee, HR, Admin" },
  { value: "HR", label: "HR", desc: "Visible to HR and Admin only" },
  { value: "ADMIN", label: "Admin", desc: "Visible to Admin only" },
];

const STATUS_STYLES = {
  PROCESSING: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    color: "var(--chart-4)",
  },
  READY: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    color: "var(--chart-5)",
  },
  FAILED: {
    backgroundColor: "rgba(202, 50, 20, 0.1)",
    color: "var(--destructive)",
  },
};

export default function Upload() {
  const [documents, setDocuments] = useState([]);
  const [visibility, setVisibility] = useState("PUBLIC");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await client.get("/documents/list");
      setDocuments(res.data.documents);
    } catch {
      // silent — list will just stay stale, polling will retry
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    pollRef.current = setInterval(fetchDocuments, 2000);
    return () => clearInterval(pollRef.current);
  }, [fetchDocuments]);

  async function uploadFile(file) {
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", visibility);

    try {
      await client.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 p-8">
      <div className="w-full">
        <h1 className="mb-1 text-xl font-bold text-[var(--foreground)]">Upload Documents</h1>
        <p className="mb-6 text-sm text-[var(--muted-foreground)]">
          Tag each document with a visibility level — this controls exactly who can retrieve it in chat.
        </p>

        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Visibility</label>
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  visibility === opt.value
                    ? "border-[var(--primary)] bg-[var(--muted)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]"
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{opt.desc}</div>
              </button>
            ))}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-[var(--primary)] bg-[var(--muted)]" : "border-[var(--border)] hover:border-[var(--primary)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <p className="font-medium text-[var(--foreground)]">
              {uploading ? "Uploading..." : "Drag & drop a file here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">PDF, DOCX, or TXT — max 10MB</p>
          </div>

          {error && <p className="mt-3 text-sm text-[var(--destructive)]">{error}</p>}
        </div>

        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Your Documents</h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm divide-y divide-[var(--border)]">
          {documents.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">No documents yet.</p>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{doc.filename}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {doc.visibility} · {doc.chunk_count} chunks
                  {doc.error_message ? ` · ${doc.error_message}` : ""}
                </p>
              </div>
              <span
                className="ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={STATUS_STYLES[doc.status] || { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
              >
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
