/**
 * Server-side image processor (fallback only)
 * Main processing happens client-side via clientImageProcessor.ts
 */

/**
 * Pass through - images should be preprocessed client-side
 */
export async function photoToColoringPage(imageBuffer: Buffer): Promise<Buffer> {
  console.log(`photoToColoringPage: passing through ${imageBuffer.length} bytes`);
  return imageBuffer;
}

/**
 * Pass through for paint-by-numbers
 */
export async function photoToPaintByNumbers(
  imageBuffer: Buffer,
  numColors: number = 8
): Promise<{ image: Buffer; palette: string[] }> {
  console.log(`photoToPaintByNumbers: passing through ${imageBuffer.length} bytes`);
  
  // Default palette
  const palette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ].slice(0, numColors);
  
  return { image: imageBuffer, palette };
}
