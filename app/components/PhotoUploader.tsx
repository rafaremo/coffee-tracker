import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";

interface Props {
  defaultPhotoPath?: string | null;
  name?: string;
}

export default function PhotoUploader({ defaultPhotoPath, name = "photoPath" }: Props) {
  const [photoPath, setPhotoPath] = useState(defaultPhotoPath || "");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(defaultPhotoPath || "");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.photoPath) {
        setPhotoPath(data.photoPath);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPhotoPath("");
    setPreview("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={photoPath} />

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Coffee preview"
            className="w-48 h-48 object-cover rounded-xl border border-coffee-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow hover:bg-red-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-48 h-48 bg-coffee-100 border-2 border-dashed border-coffee-300 rounded-xl flex flex-col items-center justify-center text-coffee-500 hover:bg-coffee-200 hover:border-coffee-400 transition disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Upload className="w-8 h-8 mb-2 animate-bounce" />
              <span className="text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-sm">Add photo</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
