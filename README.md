# Malbuch Generator

Personalized coloring books and paint-by-numbers from your photos.

## Features

- **Ausmalbuch (Coloring Book)**: Convert photos to line art for coloring
- **Malen nach Zahlen (Paint by Numbers)**: Auto-generate numbered regions with color palette
- **Personalization**: Custom name on cover and pages
- **Instant PDF**: Download-ready A4 format

## Tech Stack

- Next.js 14
- Sharp (image processing)
- jsPDF (PDF generation)
- Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

## How It Works

1. User uploads photos (up to 20)
2. Enters a name for personalization
3. Selects book type (coloring, paint-by-numbers, or both)
4. System processes images:
   - Coloring: Edge detection → line art conversion
   - Paint-by-numbers: Color quantization → region mapping → number overlay
5. PDF generated with cover, pages, and color palette
6. Instant download

## Business Model

- €4.99 per book
- Digital download (no shipping)
- Target: German market (Etsy DE)

## TODO

- [ ] Stripe payment integration
- [ ] Email delivery
- [ ] Etsy integration
- [ ] Better edge detection algorithm
- [ ] Add number labels to paint-by-numbers regions
