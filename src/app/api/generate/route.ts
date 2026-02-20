import { NextRequest, NextResponse } from 'next/server';
import { photoToColoringPage, photoToPaintByNumbers } from '@/lib/imageProcessor';
import { generateBook, BookPage } from '@/lib/pdfGenerator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const bookType = formData.get('type') as 'coloring' | 'paint-by-numbers' | 'both';
    const photos = formData.getAll('photos') as File[];

    if (!name || !photos.length) {
      return NextResponse.json(
        { error: 'Name und mindestens ein Foto sind erforderlich' },
        { status: 400 }
      );
    }

    if (photos.length > 20) {
      return NextResponse.json(
        { error: 'Maximal 20 Fotos erlaubt' },
        { status: 400 }
      );
    }

    const pages: BookPage[] = [];

    console.log(`Processing ${photos.length} photos for ${name}, type: ${bookType}`);

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      console.log(`Photo ${i + 1}: ${photo.name}, type: ${photo.type}, size: ${photo.size} bytes`);
      
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`Buffer created: ${buffer.length} bytes`);
      
      // Log first bytes to identify format
      const header = buffer.slice(0, 8);
      console.log(`File header: ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

      if (bookType === 'coloring' || bookType === 'both') {
        console.log('Generating coloring page...');
        const coloringPage = await photoToColoringPage(buffer);
        console.log(`Coloring page result: ${coloringPage.length} bytes`);
        pages.push({
          image: coloringPage,
          type: 'coloring',
        });
      }

      if (bookType === 'paint-by-numbers' || bookType === 'both') {
        console.log('Generating paint-by-numbers...');
        const { image, palette } = await photoToPaintByNumbers(buffer, 12);
        console.log(`Paint-by-numbers result: ${image.length} bytes, palette: ${palette.join(', ')}`);
        pages.push({
          image,
          type: 'paint-by-numbers',
          colorPalette: palette,
        });
      }
    }
    
    console.log(`Total pages to generate: ${pages.length}`);

    console.log(`Generating PDF with ${pages.length} pages`);
    
    const pdfBuffer = await generateBook({
      name,
      pages,
    });

    console.log(`PDF generated: ${pdfBuffer.length} bytes`);

    // Sanitize filename for Content-Disposition
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_') || 'Malbuch';
    const filename = `${safeName}_Malbuch.pdf`;
    
    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Fehler beim Erstellen: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Preview endpoint - returns just one processed image
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'coloring';
  
  return NextResponse.json({
    message: 'Use POST to generate a book',
    supportedTypes: ['coloring', 'paint-by-numbers', 'both'],
    maxPhotos: 20,
  });
}
