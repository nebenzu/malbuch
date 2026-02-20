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
  // Convert to grayscale, apply edge detection effect
  const processed = await sharp(imageBuffer)
    .resize(2480, 3508, { fit: 'inside' }) // A4 at 300dpi
    .grayscale()
    .normalize()
    .linear(1.5, -0.2) // Increase contrast
    .sharpen({ sigma: 2 })
    .threshold(200) // Convert to pure black/white lines
    .negate() // Invert for coloring book style
    .png()
    .toBuffer();

  return processed;
}

/**
 * Convert photo to paint-by-numbers with numbered regions
 */
export async function photoToPaintByNumbers(
  imageBuffer: Buffer,
  numColors: number = 12
): Promise<{ image: Buffer; palette: string[] }> {
  // Step 1: Resize and reduce colors
  const resized = await sharp(imageBuffer)
    .resize(2480, 3508, { fit: 'inside' })
    .toBuffer();

  // Step 2: Get image metadata
  const metadata = await sharp(resized).metadata();
  const { width = 2480, height = 3508 } = metadata;

  // Step 3: Extract raw pixel data
  const { data, info } = await sharp(resized)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Step 4: Quantize colors using simple k-means-like approach
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const palette = quantizeColors(pixels, numColors);
  
  // Step 5: Map each pixel to nearest palette color
  const mappedData = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < pixels.length; i++) {
    const nearestIdx = findNearestColor(pixels[i], palette);
    const color = palette[nearestIdx];
    mappedData[i * 3] = color[0];
    mappedData[i * 3 + 1] = color[1];
    mappedData[i * 3 + 2] = color[2];
  }

  // Step 6: Create the paint-by-numbers image
  const quantizedImage = await sharp(mappedData, {
    raw: { width: info.width, height: info.height, channels: 3 }
  })
    .png()
    .toBuffer();

  // Convert palette to hex
  const hexPalette = palette.map(([r, g, b]) => 
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  );

  return { image: quantizedImage, palette: hexPalette };
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
