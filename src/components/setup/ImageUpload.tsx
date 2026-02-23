"use client";

import { useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { LatLngBounds } from "@/types/geo";
import { computeImageBounds } from "@/utils/bounds";
import { Upload, X } from "lucide-react";

interface ImageUploadProps {
  file: File | null;
  bounds: LatLngBounds | null;
  onImageSelectAction: (file: File | null) => void;
  onBoundsChangeAction: (bounds: LatLngBounds | null) => void;
}

export function ImageUpload({
  file,
  onImageSelectAction,
  onBoundsChangeAction,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    onImageSelectAction(selected);

    const url = URL.createObjectURL(selected);
    const img = new globalThis.Image();
    img.onload = () => {
      onBoundsChangeAction(computeImageBounds(img.width, img.height));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const clearFile = () => {
    onImageSelectAction(null);
    onBoundsChangeAction(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Base Image</Label>
        <div className="mt-2">
          {!preview ? (
            <button
              type="button"
              className="w-full border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF up to 50MB
              </p>
            </button>
          ) : (
            <div className="relative">
              <Image
                src={preview}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-lg border"
                width={800}
                height={600}
                unoptimized
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
