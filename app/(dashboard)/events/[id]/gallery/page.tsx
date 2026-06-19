"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Camera, Upload, X, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type EventPhoto = {
  id: string;
  agency_id: string;
  event_id: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  uploaded_at: string;
};

type UploadProgress = {
  fileName: string;
  progress: number; // 0–100
  status: "uploading" | "done" | "error";
};

export default function GalleryPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [editingCaption, setEditingCaption] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  async function getAgencyId(): Promise<string | null> {
    if (agencyId) return agencyId;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // agency_id is stored in user metadata or we can fetch from profile
    const id = user.user_metadata?.agency_id || user.id;
    setAgencyId(id);
    return id;
  }

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("event_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("[Gallery] Load error:", error.message);
    }
    if (data) {
      setPhotos(data);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const aid = await getAgencyId();
    if (!aid) {
      addToast({
        title: "Not authenticated",
        description: "Please log in to upload photos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const fileList = Array.from(files);
    const progressItems: UploadProgress[] = fileList.map((f) => ({
      fileName: f.name,
      progress: 0,
      status: "uploading",
    }));
    setUploadProgress(progressItems);

    let uploadCount = 0;
    const errors: string[] = [];
    const currentMaxOrder =
      photos.length > 0 ? Math.max(...photos.map((p) => p.sort_order)) : 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: "error", progress: 0 } : p
          )
        );
        continue;
      }

      // Simulate progress start
      setUploadProgress((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, progress: 30 } : p
        )
      );

      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storagePath = `${aid}/${eventId}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("[Gallery] Upload error:", uploadError.message);
        errors.push(`${file.name}: ${uploadError.message}`);
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: "error", progress: 0 } : p
          )
        );
        continue;
      }

      // Progress after storage upload
      setUploadProgress((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, progress: 70 } : p
        )
      );

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl || "";

      // Insert record into event_photos table
      const { error: insertError } = await supabase
        .from("event_photos")
        .insert({
          agency_id: aid,
          event_id: eventId,
          url: publicUrl,
          thumbnail_url: null,
          caption: null,
          sort_order: currentMaxOrder + i + 1,
          uploaded_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[Gallery] Insert error:", insertError.message);
        errors.push(`${file.name}: ${insertError.message}`);
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: "error", progress: 0 } : p
          )
        );
        continue;
      }

      // Complete
      setUploadProgress((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: "done", progress: 100 } : p
        )
      );
      uploadCount++;
    }

    if (uploadCount > 0) {
      addToast({
        title: `Uploaded ${uploadCount} photo${uploadCount > 1 ? "s" : ""}!`,
        variant: "success",
      });
      loadPhotos();
    }
    if (errors.length > 0) {
      addToast({
        title: `${errors.length} upload${errors.length > 1 ? "s" : ""} failed`,
        description: errors.join("; "),
        variant: "destructive",
      });
    }

    // Clear progress after a brief delay
    setTimeout(() => {
      setUploadProgress([]);
      setUploading(false);
    }, 1500);

    e.target.value = "";
  }

  async function handleSaveCaption() {
    if (!selectedPhoto) return;
    setSavingCaption(true);

    const { error } = await supabase
      .from("event_photos")
      .update({ caption: editingCaption || null })
      .eq("id", selectedPhoto.id);

    if (error) {
      addToast({
        title: "Failed to save caption",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSelectedPhoto({ ...selectedPhoto, caption: editingCaption || null });
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === selectedPhoto.id
            ? { ...p, caption: editingCaption || null }
            : p
        )
      );
      addToast({ title: "Caption saved", variant: "success" });
    }
    setSavingCaption(false);
  }

  async function handleDelete() {
    if (!selectedPhoto) return;
    setDeleting(true);

    // Extract storage path from URL
    // The URL format is typically: ...storage/v1/object/public/photos/{agency_id}/{event_id}/{filename}
    const urlParts = selectedPhoto.url.split("/photos/");
    const storagePath = urlParts.length > 1 ? urlParts[urlParts.length - 1] : null;

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from("photos")
        .remove([decodeURIComponent(storagePath)]);
      if (storageError) {
        console.error("[Gallery] Storage delete error:", storageError.message);
      }
    }

    const { error } = await supabase
      .from("event_photos")
      .delete()
      .eq("id", selectedPhoto.id);

    if (error) {
      addToast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      addToast({ title: "Photo deleted", variant: "success" });
      setPhotos((prev) => prev.filter((p) => p.id !== selectedPhoto.id));
      setSelectedPhoto(null);
      setShowDeleteConfirm(false);
    }
    setDeleting(false);
  }

  function openLightbox(photo: EventPhoto) {
    setSelectedPhoto(photo);
    setEditingCaption(photo.caption || "");
    setShowDeleteConfirm(false);
  }

  function closeLightbox() {
    setSelectedPhoto(null);
    setEditingCaption("");
    setShowDeleteConfirm(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/events/${eventId}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-navy-900">Photo Gallery</h1>
          <p className="text-sm text-navy-500">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="mb-4 space-y-2 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-navy-700">Uploading...</p>
          {uploadProgress.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="max-w-[200px] truncate text-navy-600">
                  {item.fileName}
                </span>
                <span
                  className={
                    item.status === "done"
                      ? "text-emerald-600"
                      : item.status === "error"
                      ? "text-red-500"
                      : "text-navy-500"
                  }
                >
                  {item.status === "done"
                    ? "Done"
                    : item.status === "error"
                    ? "Failed"
                    : `${item.progress}%`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.status === "done"
                      ? "bg-emerald-500"
                      : item.status === "error"
                      ? "bg-red-500"
                      : "bg-navy-500"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => openLightbox(photo)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-navy-100 focus:outline-none focus:ring-2 focus:ring-navy-400"
            >
              <img
                src={photo.url}
                alt={photo.caption || "Event photo"}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="truncate text-xs text-white">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-navy-100">
            <Camera className="h-8 w-8 text-navy-400" />
          </div>
          <p className="mb-1 text-base font-semibold text-navy-900">
            No photos yet
          </p>
          <p className="mb-6 text-center text-sm text-navy-500">
            Upload your first event photo.
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Photos
          </Button>
        </div>
      )}

      {/* Lightbox / Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Image */}
            <div className="relative flex-1 overflow-hidden bg-black">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || "Event photo"}
                className="h-auto max-h-[60vh] w-full object-contain"
              />
            </div>

            {/* Caption & Actions */}
            <div className="space-y-3 p-4">
              {/* Editable Caption */}
              <div className="flex items-center gap-2">
                <Input
                  value={editingCaption}
                  onChange={(e) => setEditingCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCaption();
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveCaption}
                  disabled={
                    savingCaption ||
                    editingCaption === (selectedPhoto.caption || "")
                  }
                >
                  {savingCaption ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>

              {/* Delete Section */}
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
                  <p className="flex-1 text-sm text-red-700">
                    Delete this photo permanently?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Photo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
