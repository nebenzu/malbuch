import { Jimp, rgbaToInt } from 'jimp';

// Set to true to bypass Jimp and just pass through original image
// TESTING: enabled to check if PDF embedding works without Jimp processing
const BYPASS_PROCESSING = true;

/**
 * Convert photo to coloring book page
 * Uses JPEG to avoid alpha channel issues in PDF
 */
export async function photoToColoringPage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    console.log(`Input buffer: ${imageBuffer.length} bytes`);
    
    // Log input format
    const header = imageBuffer.slice(0, 8);
    const headerHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`Input header: ${headerHex}`);
    
    // Check if it's already a JPEG
    const isJpeg = header[0] === 0xff && header[1] === 0xd8;
    console.log(`Input is JPEG: ${isJpeg}`);
    
    // BYPASS MODE: just return original if it's already JPEG
    if (BYPASS_PROCESSING && isJpeg) {
      console.log('BYPASS MODE: returning original JPEG');
      return imageBuffer;
    }
    
    let image;
    try {
      image = await Jimp.read(imageBuffer);
      console.log(`Jimp loaded image: ${image.width}x${image.height}`);
    } catch (readError) {
      console.error('Failed to read image with Jimp:', readError);
      
      // If input is JPEG and Jimp fails, return original
      if (isJpeg) {
        console.log('Jimp failed but input is JPEG, returning original');
        return imageBuffer;
      }
      
      // Create a placeholder image
      console.log('Creating placeholder image');
      image = new Jimp({ width: 400, height: 300, color: 0xccccccff });
      for (let i = 0; i < 300; i++) {
        const x1 = Math.floor(i * 400 / 300);
        const x2 = 400 - x1;
        if (x1 < 400 && x1 >= 0) image.setPixelColor(rgbaToInt(100, 100, 100, 255), x1, i);
        if (x2 < 400 && x2 >= 0) image.setPixelColor(rgbaToInt(100, 100, 100, 255), x2, i);
      }
    }
    
    // Resize if needed
    const width = image.width;
    const height = image.height;
    const maxDim = 800;
    
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      image.resize({ w: Math.round(width * scale), h: Math.round(height * scale) });
      console.log(`Resized to: ${image.width}x${image.height}`);
    }
    
    // Convert to grayscale
    image.greyscale();
    console.log('Applied greyscale');
    
    // Boost contrast to make lines more visible
    image.contrast(0.5);
    console.log('Applied contrast');
    
    // Use JPEG to avoid alpha channel issues
    const buffer = await image.getBuffer('image/jpeg');
    
    // Verify it's a valid JPEG
    const isValidJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    console.log(`Output: ${buffer.length} bytes, valid JPEG: ${isValidJpeg}`);
    
    if (!isValidJpeg) {
      console.error('Generated invalid JPEG, returning original if possible');
      if (isJpeg) return imageBuffer;
      throw new Error('Generated invalid JPEG');
    }
    
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
    
    // Posterize to reduce colors
    image.posterize(numColors);
    
    // Get the buffer
    const buffer = await image.getBuffer('image/png');
    
    // Extract dominant colors for the palette
    const palette = extractPalette(image, numColors);
    
    console.log(`Paint-by-numbers generated: ${buffer.length} bytes, ${palette.length} colors`);
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
  
  const width = image.width;
  const height = image.height;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 1000)));
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      try {
        const color = image.getPixelColor(x, y);
        const r = (color >> 24) & 0xFF;
        const g = (color >> 16) & 0xFF;
        const b = (color >> 8) & 0xFF;
        const hex = rgbToHex(r, g, b);
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
      } catch {
        // Skip
      }
    }
  }
  
  const sorted = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, numColors)
    .map(([hex]) => hex);
  
  const defaults = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  while (sorted.length < numColors) {
    sorted.push(defaults[sorted.length % defaults.length]);
  }
  
  return sorted;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
