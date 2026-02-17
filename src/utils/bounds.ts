import type { LatLngBounds } from "@/types/geo";

export function computeImageBounds(
  imageWidth: number,
  imageHeight: number,
  referenceWidth = 180,
): LatLngBounds {
  const height = referenceWidth / (imageWidth / imageHeight);
  return [
    [-height / 2, -referenceWidth / 2],
    [height / 2, referenceWidth / 2],
  ];
}
