import sharp from 'sharp';

export interface ProcessedImage {
  coloringPage: Buffer;
  paintByNumbers: Buffer;
  colorPalette: string[];
  width: number;
  height: number;
}

/**
 * Convert photo to coloring book page (line art)
 */
export async function photoToColoringPage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Simpler processing pipeline for serverless compatibility
    const processed = await sharp(imageBuffer)
      .resize(1240, 1754, { fit: 'inside' }) // A4 at 150dpi (smaller for faster processing)
      .grayscale()
      .blur(0.5)
      .threshold(128)
      .negate()
      .png()
      .toBuffer();

    return processed;
  } catch (error) {
    console.error('photoToColoringPage error:', error);
    throw new Error(`Bildverarbeitung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Convert photo to paint-by-numbers with numbered regions
 */
export async function photoToPaintByNumbers(
  imageBuffer: Buffer,
  numColors: number = 8
): Promise<{ image: Buffer; palette: string[] }> {
  try {
    // Simplified approach: posterize the image
    const processed = await sharp(imageBuffer)
      .resize(1240, 1754, { fit: 'inside' }) // Smaller for serverless
      .modulate({ saturation: 1.3 }) // Boost colors
      .png({ colours: numColors }) // Use PNG color quantization
      .toBuffer();

    // Generate a simple palette based on common colors
    const defaultPalette = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];

    return { image: processed, palette: defaultPalette.slice(0, numColors) };
  } catch (error) {
    console.error('photoToPaintByNumbers error:', error);
    throw new Error(`Malen-nach-Zahlen fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Simple color quantization
 */
function quantizeColors(
  pixels: [number, number, number][],
  numColors: number
): [number, number, number][] {
  // Sample pixels for speed
  const sampleSize = Math.min(10000, pixels.length);
  const step = Math.floor(pixels.length / sampleSize);
  const sampled = pixels.filter((_, i) => i % step === 0);

  // Initialize centroids randomly
  let centroids: [number, number, number][] = [];
  for (let i = 0; i < numColors; i++) {
    centroids.push(sampled[Math.floor(Math.random() * sampled.length)]);
  }

  // K-means iterations
  for (let iter = 0; iter < 10; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: numColors }, () => []);
    
    // Assign pixels to nearest centroid
    for (const pixel of sampled) {
      const nearestIdx = findNearestColor(pixel, centroids);
      clusters[nearestIdx].push(pixel);
    }

    // Update centroids
    centroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i];
      const sum = cluster.reduce(
        (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
        [0, 0, 0]
      );
      return [
        Math.round(sum[0] / cluster.length),
        Math.round(sum[1] / cluster.length),
        Math.round(sum[2] / cluster.length),
      ] as [number, number, number];
    });
  }

  return centroids;
}

/**
 * Find index of nearest color in palette
 */
function findNearestColor(
  pixel: [number, number, number],
  palette: [number, number, number][]
): number {
  let minDist = Infinity;
  let minIdx = 0;
  
  for (let i = 0; i < palette.length; i++) {
    const dist = Math.sqrt(
      Math.pow(pixel[0] - palette[i][0], 2) +
      Math.pow(pixel[1] - palette[i][1], 2) +
      Math.pow(pixel[2] - palette[i][2], 2)
    );
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  
  return minIdx;
}

/**
 * Create outline version for paint-by-numbers (edges only)
 */
export async function createPaintByNumbersOutline(imageBuffer: Buffer): Promise<Buffer> {
  // Edge detection to create outlines
  const outline = await sharp(imageBuffer)
    .greyscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1], // Laplacian edge detection
    })
    .negate()
    .threshold(240)
    .png()
    .toBuffer();

  return outline;
}
