import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface SelectedImage {
  file: File;
  previewUrl: string;
}

interface ImageUploaderProps {
  images: SelectedImage[];
  onChange: (images: SelectedImage[]) => void;
}

/**
 * Holds real `File` objects (not just their blob-URL previews) so
 * `ReportForm` has something to actually upload to Cloudinary — the
 * previous version only ever kept `URL.createObjectURL()` strings and threw
 * the `File` away, which is why uploads were never wired up for real.
 */
export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Revoke every preview blob URL on unmount so drafted-but-never-submitted
  // reports don't leak object URLs for the lifetime of the tab.
  useEffect(() => {
    return () => {
      for (const image of images) URL.revokeObjectURL(image.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setRejectionError(null);

    const remaining = MAX_IMAGES - images.length;
    const candidates = Array.from(files).slice(0, remaining);
    const accepted: SelectedImage[] = [];

    for (const file of candidates) {
      if (!file.type.startsWith("image/")) {
        setRejectionError(t("report.errorImageType"));
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setRejectionError(t("report.errorImageSize"));
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (accepted.length > 0) onChange([...images, ...accepted]);
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(images[index].previewUrl);
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{t("report.attachImages")}</p>

      {images.length < MAX_IMAGES && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-colors ${
            isDragging
              ? "border-brand-500 bg-brand-50"
              : "border-gray-300 bg-gray-50"
          }`}
        >
          <Camera size={28} className="text-brand-500" />
          <p className="text-brand-600 text-sm font-medium">
            {t("report.uploadHint")}
          </p>
          <p className="text-xs text-gray-400">
            {t("report.uploadLimit")}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              // Allow re-selecting the same rejected file after fixing it.
              e.target.value = "";
            }}
          />
        </label>
      )}

      {rejectionError && (
        <p className="mt-1.5 text-xs text-red-500">{rejectionError}</p>
      )}

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((image, i) => (
            <div
              key={image.previewUrl}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-200"
            >
              <img
                src={image.previewUrl}
                alt={t("report.attachedImageAlt", { index: i + 1 })}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label={t("report.removeImage")}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
