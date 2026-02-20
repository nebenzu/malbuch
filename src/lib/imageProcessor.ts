import sharp from 'sharp';

/**
 * Convert photo to coloring book page (line art)
 * Uses edge detection via Sharp
 */
export async function photoToColoringPage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Step 1: Resize and convert to grayscale
    const grayscale = await sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .toBuffer();
    
    // Step 2: Create edge detection using Laplacian kernel
    const edges = await sharp(grayscale)
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      })
      .toBuffer();
    
    // Step 3: Negate (invert) and increase contrast for coloring book look
    const result = await sharp(edges)
      .negate()
      .normalize() // Auto-levels to use full range
      .linear(1.5, 0) // Boost contrast
      .png()
      .toBuffer();
    
    console.log(`Coloring page generated: ${result.length} bytes`);
    return result;
  } catch (error) {
    console.error('photoToColoringPage error:', error);
    throw new Error(`Bildverarbeitung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Convert photo to paint-by-numbers style
 * Uses color quantization
 */
export async function photoToPaintByNumbers(
  imageBuffer: Buffer,
  numColors: number = 8
): Promise<{ image: Buffer; palette: string[] }> {
  try {
    // Resize and reduce colors
    const result = await sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .png({ colours: numColors, dither: 0 }) // Reduce to N colors, no dithering
      .toBuffer();
    
    // Extract palette from the image
    const { dominant } = await sharp(imageBuffer)
      .resize(100, 100, { fit: 'inside' })
      .stats();
    
    // Get palette by sampling the quantized image
    const palette = await extractPaletteFromBuffer(result, numColors);
    
    console.log(`Paint-by-numbers generated: ${result.length} bytes`);
    return { image: result, palette };
  } catch (error) {
    console.error('photoToPaintByNumbers error:', error);
    throw new Error(`Malen-nach-Zahlen fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Extract color palette from PNG buffer
 */
async function extractPaletteFromBuffer(buffer: Buffer, numColors: number): Promise<string[]> {
  try {
    const { channels, width, height } = await sharp(buffer).metadata();
    const { data } = await sharp(buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const colorCounts: Map<string, number> = new Map();
    const bytesPerPixel = channels || 3;
    const step = Math.max(1, Math.floor(Math.sqrt((width! * height!) / 500)));
    
    for (let y = 0; y < height!; y += step) {
      for (let x = 0; x < width!; x += step) {
        const idx = (y * width! + x) * bytesPerPixel;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
      }
    }
    
    const sorted = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, numColors)
      .map(([hex]) => hex);
    
    // Pad with defaults if needed
    const defaults = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    while (sorted.length < numColors) {
      sorted.push(defaults[sorted.length % defaults.length]);
    }
    
    return sorted;
  } catch (error) {
    console.error('extractPaletteFromBuffer error:', error);
    return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  }
}
