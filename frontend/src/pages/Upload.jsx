import { useCallback, useEffect, useRef, useState } from "react";
import client from "../api/client";

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public", desc: "Visible to everyone" },
  { value: "EMPLOYEE", label: "Employee", desc: "Visible to Employee, HR, Admin" },
  { value: "HR", label: "HR", desc: "Visible to HR and Admin only" },
  { value: "ADMIN", label: "Admin", desc: "Visible to Admin only" },
];

const STATUS_STYLES = {
  PROCESSING: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
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
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Upload Documents</h1>
      <p className="text-slate-500 text-sm mb-6">
        Tag each document with a visibility level — this controls exactly who can retrieve it in chat.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-2">Visibility</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setVisibility(opt.value)}
              className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                visibility === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
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
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <p className="text-slate-600 font-medium">
            {uploading ? "Uploading..." : "Drag & drop a file here, or click to browse"}
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT — max 10MB</p>
        </div>

        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-3">Your Documents</h2>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {documents.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No documents yet.</p>
        )}
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{doc.filename}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {doc.visibility} · {doc.chunk_count} chunks
                {doc.error_message ? ` · ${doc.error_message}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 ml-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
                STATUS_STYLES[doc.status] || "bg-slate-100 text-slate-600"
              }`}
            >
              {doc.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
