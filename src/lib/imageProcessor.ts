import { Jimp } from 'jimp';

/**
 * Convert photo to coloring book page (line art)
 */
export async function photoToColoringPage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = await Jimp.read(imageBuffer);
    
    // Resize to reasonable size for performance
    const width = image.width;
    const height = image.height;
    const maxDim = 800;
    
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      image.resize({ w: Math.round(width * scale), h: Math.round(height * scale) });
    }
    
    // Convert to grayscale
    image.greyscale();
    
    // Increase contrast
    image.contrast(0.4);
    
    // Apply edge detection effect using convolution
    image.convolute([
      [-1, -1, -1],
      [-1,  8, -1],
      [-1, -1, -1]
    ]);
    
    // Invert for coloring book style (dark lines on white)
    image.invert();
    
    // Increase contrast again to make lines clearer
    image.contrast(0.5);
    
    // Convert to PNG buffer
    const buffer = await image.getBuffer('image/png');
    return buffer;
  } catch (error) {
    console.error('photoToColoringPage error:', error);
    throw new Error(`Bildverarbeitung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Convert photo to paint-by-numbers style
 */
export async function photoToPaintByNumbers(
  imageBuffer: Buffer,
  numColors: number = 8
): Promise<{ image: Buffer; palette: string[] }> {
  try {
    const image = await Jimp.read(imageBuffer);
    
    // Resize
    const width = image.width;
    const height = image.height;
    const maxDim = 800;
    
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      image.resize({ w: Math.round(width * scale), h: Math.round(height * scale) });
    }
    
    // Posterize to reduce colors (creates paint-by-numbers effect)
    image.posterize(numColors);
    
    // Get the buffer
    const buffer = await image.getBuffer('image/png');
    
    // Extract dominant colors for the palette
    const palette = extractPalette(image, numColors);
    
    return { image: buffer, palette };
  } catch (error) {
    console.error('photoToPaintByNumbers error:', error);
    throw new Error(`Malen-nach-Zahlen fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Extract color palette from posterized image
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPalette(image: any, numColors: number): string[] {
  const colorCounts: Map<string, number> = new Map();
  
  // Sample pixels
  const width = image.width;
  const height = image.height;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 1000)));
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const color = image.getPixelColor(x, y);
      // Extract RGB from color int
      const r = (color >> 24) & 0xFF;
      const g = (color >> 16) & 0xFF;
      const b = (color >> 8) & 0xFF;
      const hex = rgbToHex(r, g, b);
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
  }
  
  // Sort by frequency and take top colors
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
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
