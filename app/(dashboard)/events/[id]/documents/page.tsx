"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Loader2, Trash2, FileText, Upload, ExternalLink, Image, File, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

type Document = {
  id: string;
  name: string;
  storedName: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  uploaded_at: string;
};

export default function DocumentsPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("contract");
  const [bucketError, setBucketError] = useState(false);

  const DOC_CATEGORIES = [
    { value: "contract", label: "Contract" },
    { value: "quotation", label: "Quotation" },
    { value: "receipt", label: "Receipt" },
    { value: "invoice", label: "Invoice" },
    { value: "floor_plan", label: "Floor Plan" },
    { value: "photo", label: "Photo" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => { load(); }, []);

  async function ensureBucket() {
    // Check if bucket exists by trying to list - if it fails, try to create it
    const { error: listError } = await supabase.storage.from("documents").list("", { limit: 1 });
    if (listError) {
      // Bucket might not exist - try creating it
      const { error: createError } = await supabase.storage.createBucket("documents", {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
          "application/pdf",
          "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
      });
      if (createError && !createError.message.includes("already exists")) {
        console.error("[Documents] Bucket error:", createError.message);
        setBucketError(true);
        return false;
      }
    }
    return true;
  }

  async function load() {
    const bucketOk = await ensureBucket();
    if (!bucketOk) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.storage.from("documents").list(`events/${eventId}`, {
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.error("[Documents] List error:", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      // Filter out .emptyFolderPlaceholder files that Supabase creates
      const docs = data
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => {
          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(`events/${eventId}/${f.name}`);
          const parts = f.name.split("__");
          const cat = parts.length > 1 ? parts[0] : "other";
          const originalName = parts.length > 1 ? parts.slice(1).join("__") : f.name;
          return {
            id: f.id || f.name,
            name: originalName,
            storedName: f.name, // keep full stored name for delete
            file_url: urlData?.publicUrl || "",
            file_type: f.metadata?.mimetype || "",
            file_size: f.metadata?.size || 0,
            category: cat,
            uploaded_at: f.created_at || new Date().toISOString(),
          };
        });
      setDocuments(docs);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    let uploadCount = 0;
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      const safeName = `${category}__${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const path = `events/${eventId}/${safeName}`;

      const { error } = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        console.error("[Documents] Upload error:", error.message, "for file:", file.name);
        errors.push(`${file.name}: ${error.message}`);
      } else {
        uploadCount++;
      }
    }

    if (uploadCount > 0) {
      addToast({ title: `Uploaded ${uploadCount} file${uploadCount > 1 ? "s" : ""}!`, variant: "success" });
      load();
    }
    if (errors.length > 0) {
      addToast({
        title: `${errors.length} upload${errors.length > 1 ? "s" : ""} failed`,
        description: errors.join("; "),
        variant: "destructive",
      });
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(storedName: string) {
    const path = `events/${eventId}/${storedName}`;
    const { error } = await supabase.storage.from("documents").remove([path]);
    if (error) {
      console.error("[Documents] Delete error:", error.message);
      addToast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Deleted", variant: "success" });
      load();
    }
  }

  function getFileIcon(type: string) {
    if (type.startsWith("image/")) return Image;
    return File;
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Documents</h1>
          <p className="text-sm text-navy-500">{documents.length} files</p>
        </div>
      </div>

      {/* Bucket Setup Error */}
      {bucketError && (
        <div className="mb-4 rounded-xl bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Storage Not Configured</h3>
              <p className="mt-1 text-xs text-red-600">
                The document storage bucket needs to be created in your Supabase project. Go to
                <strong> Supabase Dashboard → Storage</strong> and create a bucket named <code className="rounded bg-red-100 px-1">documents</code> with public access enabled.
              </p>
              <div className="mt-2 rounded-lg bg-red-100 p-3">
                <p className="font-mono text-xs text-red-800">
                  Steps:<br />
                  1. Go to Supabase Dashboard → Storage<br />
                  2. Click &quot;New Bucket&quot;<br />
                  3. Name: <strong>documents</strong><br />
                  4. Toggle &quot;Public bucket&quot; ON<br />
                  5. Set file size limit: 10MB<br />
                  6. Save
                </p>
              </div>
              <button onClick={() => { setBucketError(false); load(); }}
                className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {!bucketError && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 space-y-2">
            <Label className="text-xs">File Category</Label>
            <div className="flex flex-wrap gap-2">
              {DOC_CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    category === c.value ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"
                  }`}>{c.label}</button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-navy-200 p-6 transition-colors hover:border-navy-400">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-navy-400" />
            ) : (
              <Upload className="h-6 w-6 text-navy-400" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-navy-700">
                {uploading ? "Uploading..." : "Tap to upload files"}
              </p>
              <p className="text-xs text-navy-400">PDF, images, documents (max 10MB)</p>
            </div>
            <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-2">
        {documents.map((doc) => {
          const Icon = getFileIcon(doc.file_type);
          return (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy-100">
                <Icon className="h-5 w-5 text-navy-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">{doc.name}</p>
                <div className="flex gap-2 text-xs text-navy-500">
                  <span className="rounded bg-navy-100 px-1.5 py-0.5 capitalize">{doc.category.replace("_", " ")}</span>
                  {doc.file_size > 0 && <span>{formatSize(doc.file_size)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-600">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => handleDelete(doc.storedName)}
                  className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {documents.length === 0 && !bucketError && (
          <p className="py-12 text-center text-sm text-navy-400">No documents uploaded yet. Upload contracts, quotations, or photos.</p>
        )}
      </div>
    </div>
  );
}
