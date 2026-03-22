"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Loader2, Trash2, FileText, Upload, ExternalLink, Image, File } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

type Document = {
  id: string;
  name: string;
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

  async function load() {
    // Load from Supabase storage listing
    const { data } = await supabase.storage.from("documents").list(`events/${eventId}`, {
      sortBy: { column: "created_at", order: "desc" },
    });

    if (data) {
      const docs = data.map((f) => {
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(`events/${eventId}/${f.name}`);
        const parts = f.name.split("__");
        const cat = parts.length > 1 ? parts[0] : "other";
        const originalName = parts.length > 1 ? parts.slice(1).join("__") : f.name;
        return {
          id: f.id || f.name,
          name: originalName,
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
    for (const file of Array.from(files)) {
      const safeName = `${category}__${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const path = `events/${eventId}/${safeName}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (!error) uploadCount++;
    }

    if (uploadCount > 0) {
      addToast({ title: `Uploaded ${uploadCount} file${uploadCount > 1 ? "s" : ""}!`, variant: "success" });
      load();
    } else {
      addToast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(fileName: string) {
    const parts = fileName.split("__");
    const cat = parts.length > 1 ? parts[0] : "other";
    const storedName = parts.length > 1 ? fileName : fileName;
    // reconstruct the stored filename
    const { error } = await supabase.storage.from("documents").remove([`events/${eventId}/${cat}__${storedName}`]);
    if (!error) {
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

      {/* Upload Section */}
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
                <button onClick={() => handleDelete(doc.name)}
                  className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {documents.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No documents uploaded yet. Upload contracts, quotations, or photos.</p>
        )}
      </div>
    </div>
  );
}
