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

    for (const photo of photos) {
      const buffer = Buffer.from(await photo.arrayBuffer());

      if (bookType === 'coloring' || bookType === 'both') {
        const coloringPage = await photoToColoringPage(buffer);
        pages.push({
          image: coloringPage,
          type: 'coloring',
        });
      }

      if (bookType === 'paint-by-numbers' || bookType === 'both') {
        const { image, palette } = await photoToPaintByNumbers(buffer, 12);
        pages.push({
          image,
          type: 'paint-by-numbers',
          colorPalette: palette,
        });
      }
    }

    const pdfBuffer = await generateBook({
      name,
      pages,
    });

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name.replace(/[^a-zA-Z0-9]/g, '_')}_Malbuch.pdf"`,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Malbuchs' },
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
