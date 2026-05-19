import { csvToPdf, PaytmCsvError } from '@/lib/paytm/csvToPdf';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(null, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return new Response(null, { status: 400 });
    }

    const csvText = await file.text();
    const { buffer, downloadName } = await csvToPdf(csvText);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
      },
    });
  } catch (e) {
    if (e instanceof PaytmCsvError) {
      return new Response(null, { status: 400 });
    }
    console.error('Paytm PDF conversion failed:', e);
    return new Response(null, { status: 500 });
  }
}
