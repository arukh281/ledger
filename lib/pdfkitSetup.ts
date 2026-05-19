import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

// Use package.json as the resolution anchor (import.meta.url is unreliable in bundled output).
const require = createRequire(path.join(process.cwd(), "package.json"));

/** Resolved pdfkit `js/data` directory (Helvetica.afm, etc.). */
export function pdfkitDataDir(): string {
  return path.join(path.dirname(require.resolve("pdfkit")), "data");
}

/** Fail fast with a clear message if bundled paths omit pdfkit AFM fonts. */
export function assertPdfkitFontsAvailable(): void {
  const helvetica = path.join(pdfkitDataDir(), "Helvetica.afm");
  if (!fs.existsSync(helvetica)) {
    throw new Error(
      `PDFKit font data not found at ${helvetica}. Ensure serverExternalPackages includes "pdfkit" and outputFileTracingIncludes copies pdfkit/js/data.`
    );
  }
}
