import { jsPDF } from 'jspdf';

export interface BookPage {
  image: Buffer;
  type: 'coloring' | 'paint-by-numbers';
  colorPalette?: string[];
}

export interface BookConfig {
  name: string;
  title?: string;
  pages: BookPage[];
}

/**
 * Generate a personalized coloring/paint-by-numbers book PDF
 */
export async function generateBook(config: BookConfig): Promise<Buffer> {
  const { name, title, pages } = config;
  
  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cover page
  doc.setFillColor(255, 250, 240);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(60, 60, 60);
  
  const bookTitle = title || `${name}'s Malbuch`;
  doc.text(bookTitle, pageWidth / 2, pageHeight / 3, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text('Ein personalisiertes Malbuch', pageWidth / 2, pageHeight / 3 + 20, { align: 'center' });
  
  // Decorative elements
  doc.setDrawColor(200, 180, 160);
  doc.setLineWidth(0.5);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);
  
  // Add each page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    doc.addPage();
    
    // Page number
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`${i + 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Convert buffer to base64 data URL
    const base64Image = page.image.toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    
    // Add image with margins
    const margin = 15;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = pageHeight - margin * 2 - 20; // Leave space for color palette
    
    try {
      doc.addImage(imageDataUrl, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
    } catch (imgError) {
      console.error('Failed to add image to PDF:', imgError);
      // Add placeholder text if image fails
      doc.setFontSize(14);
      doc.setTextColor(200, 100, 100);
      doc.text('Bild konnte nicht geladen werden', pageWidth / 2, pageHeight / 2, { align: 'center' });
    }
    
    // For paint-by-numbers, add color palette at bottom
    if (page.type === 'paint-by-numbers' && page.colorPalette) {
      const paletteY = pageHeight - 25;
      const swatchSize = 8;
      const startX = (pageWidth - page.colorPalette.length * (swatchSize + 4)) / 2;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Farbpalette:', pageWidth / 2, paletteY - 5, { align: 'center' });
      
      page.colorPalette.forEach((color, idx) => {
        const x = startX + idx * (swatchSize + 4);
        
        // Parse hex color
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        doc.setFillColor(r, g, b);
        doc.setDrawColor(100, 100, 100);
        doc.rect(x, paletteY, swatchSize, swatchSize, 'FD');
        
        // Number below swatch
        doc.setTextColor(60, 60, 60);
        doc.text(`${idx + 1}`, x + swatchSize / 2, paletteY + swatchSize + 4, { align: 'center' });
      });
    }
  }
  
  // Back cover
  doc.addPage();
  doc.setFillColor(255, 250, 240);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(120, 120, 120);
  doc.text(`Erstellt fuer ${name}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
  doc.text('malbuch.app', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
  
  // Return as buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}

/**
 * Generate a single coloring page PDF
 */
export async function generateSinglePage(
  image: Buffer,
  name: string,
  type: 'coloring' | 'paint-by-numbers',
  colorPalette?: string[]
): Promise<Buffer> {
  return generateBook({
    name,
    pages: [{ image, type, colorPalette }],
  });
}
