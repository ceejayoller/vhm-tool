/**
 * Custom canvas-based renderer for generating per-child-polygon screenshots.
 *
 * Instead of using the unmaintained `leaflet-image`, we load the uploaded
 * base image directly onto a canvas and use simple linear projection
 * (image bounds → pixel coords) to draw polygon overlays.
 */

export interface RenderBounds {
  /** [[swLat, swLng], [neLat, neLng]] */
  imageBounds: [[number, number], [number, number]];
  imageWidth: number;
  imageHeight: number;
}

export class CanvasRenderer {
  private imageBitmap: ImageBitmap;
  private bounds: RenderBounds;

  constructor(imageBitmap: ImageBitmap, imageBounds: [[number, number], [number, number]]) {
    this.imageBitmap = imageBitmap;
    this.bounds = {
      imageBounds,
      imageWidth: imageBitmap.width,
      imageHeight: imageBitmap.height,
    };
  }

  /**
   * Convert a GeoJSON [lng, lat] coordinate to pixel position on the image.
   */
  private coordToPixel(lng: number, lat: number): { x: number; y: number } {
    const [[swLat, swLng], [neLat, neLng]] = this.bounds.imageBounds;

    const maxMercatorLat = 85.05112878;
    const clampLat = (value: number) =>
      Math.max(-maxMercatorLat, Math.min(maxMercatorLat, value));
    const toMercatorY = (degLat: number) => {
      const rad = (clampLat(degLat) * Math.PI) / 180;
      return Math.log(Math.tan(Math.PI / 4 + rad / 2));
    };

    const x = ((lng - swLng) / (neLng - swLng)) * this.bounds.imageWidth;
    // Latitude is inverted: higher lat = lower y (top of image)
    const y =
      ((toMercatorY(neLat) - toMercatorY(lat)) /
        (toMercatorY(neLat) - toMercatorY(swLat))) *
      this.bounds.imageHeight;

    return { x, y };
  }

  /**
   * Convert a GeoJSON Polygon ring to pixel coordinates.
   */
  private ringToPixels(ring: number[][]): Array<{ x: number; y: number }> {
    return ring.map(([lng, lat]) => this.coordToPixel(lng, lat));
  }

  /**
   * Compute the bounding box of a set of pixel coordinates.
   */
  private pixelBBox(pixels: Array<{ x: number; y: number }>): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of pixels) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Trace a polygon path (outer ring) on a canvas context.
   */
  private tracePath(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, pixels: Array<{ x: number; y: number }>) {
    ctx.beginPath();
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  /**
   * Render a single child polygon asset:
   * - Crops to the parent polygon bounding box
   * - Clips to parent polygon shape
   * - Draws the base image
   * - Overlays the child polygon outline
   *
   * Returns the rendered image as a Blob.
   */
  async renderChildAsset(
    parentGeometry: GeoJSON.Polygon,
    childGeometry: GeoJSON.Polygon,
    options?: {
      childStrokeColor?: string;
      childStrokeWidth?: number;
      childFillColor?: string;
      childFillOpacity?: number;
      padding?: number;
    },
  ): Promise<Blob> {
    const {
      childStrokeColor = "#22c55e",
      childStrokeWidth = 3,
      childFillColor = "#22c55e",
      childFillOpacity = 0.15,
      padding = 20,
    } = options ?? {};

    const parentPixels = this.ringToPixels(parentGeometry.coordinates[0]);
    const childPixels = this.ringToPixels(childGeometry.coordinates[0]);
    const parentBBox = this.pixelBBox(parentPixels);

    // Canvas sized to parent bbox + padding
    const canvasW = Math.ceil(parentBBox.width) + padding * 2;
    const canvasH = Math.ceil(parentBBox.height) + padding * 2;
    const offsetX = parentBBox.minX - padding;
    const offsetY = parentBBox.minY - padding;

    const canvas = new OffscreenCanvas(canvasW, canvasH);
    const ctx = canvas.getContext("2d")!;

    // Translate so parent bbox starts at (padding, padding)
    ctx.save();
    ctx.translate(-offsetX, -offsetY);

    // Clip to parent polygon
    this.tracePath(ctx, parentPixels);
    ctx.clip();

    // Draw base image
    ctx.drawImage(this.imageBitmap, 0, 0);

    // Draw child polygon fill
    this.tracePath(ctx, childPixels);
    ctx.fillStyle = childFillColor;
    ctx.globalAlpha = childFillOpacity;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw child polygon stroke
    this.tracePath(ctx, childPixels);
    ctx.strokeStyle = childStrokeColor;
    ctx.lineWidth = childStrokeWidth;
    ctx.stroke();

    ctx.restore();

    return canvas.convertToBlob({ type: "image/png" });
  }

  /**
   * Render a thumbnail (scaled-down) version of a child asset.
   */
  async renderThumbnail(
    parentGeometry: GeoJSON.Polygon,
    childGeometry: GeoJSON.Polygon,
    maxWidth: number = 200,
  ): Promise<Blob> {
    const fullBlob = await this.renderChildAsset(parentGeometry, childGeometry);
    const fullBitmap = await createImageBitmap(fullBlob);

    const scale = Math.min(maxWidth / fullBitmap.width, 1);
    const thumbW = Math.round(fullBitmap.width * scale);
    const thumbH = Math.round(fullBitmap.height * scale);

    const canvas = new OffscreenCanvas(thumbW, thumbH);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(fullBitmap, 0, 0, thumbW, thumbH);
    fullBitmap.close();

    return canvas.convertToBlob({ type: "image/png" });
  }

  dispose() {
    this.imageBitmap.close();
  }
}
