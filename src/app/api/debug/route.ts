import { NextRequest, NextResponse } from 'next/server';
import { photoToColoringPage } from '@/lib/imageProcessor';

/**
 * Debug endpoint - returns processed image directly (not in PDF)
 * POST /api/debug with a single image file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;

    if (!photo) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    console.log(`Debug: Processing ${photo.name}, type: ${photo.type}, size: ${photo.size}`);

    const buffer = Buffer.from(await photo.arrayBuffer());
    console.log(`Debug: Buffer ${buffer.length} bytes`);
    
    // Log header
    const header = buffer.slice(0, 16);
    console.log(`Debug: Header ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

    // Process image
    const processed = await photoToColoringPage(buffer);
    console.log(`Debug: Processed ${processed.length} bytes`);

    // Return the processed JPEG directly
    return new NextResponse(new Uint8Array(processed), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'inline; filename="debug_processed.jpg"',
        'X-Original-Size': buffer.length.toString(),
        'X-Processed-Size': processed.length.toString(),
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST a single image file as "photo" to test image processing',
    example: 'curl -X POST -F "photo=@image.jpg" https://malbuch-generator.netlify.app/api/debug',
  });
}
