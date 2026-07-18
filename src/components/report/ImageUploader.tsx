import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";

const MAX_IMAGES = 3;

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    const next = Array.from(files)
      .slice(0, remaining)
      .map((file) => URL.createObjectURL(file));
    if (next.length > 0) onChange([...images, ...next]);
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">แนบรูปภาพ</p>

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
            แตะเพื่ออัปโหลดหรือนำรูปภาพมาวาง
          </p>
          <p className="text-xs text-gray-400">
            สูงสุด 3 รูปภาพ (ขนาดไม่เกิน 100MB ต่อรูป)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
      )}

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-200"
            >
              <img
                src={src}
                alt={`รูปที่แนบ ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="ลบรูปภาพ"
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
