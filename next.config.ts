import type { NextConfig } from "next";

const pdfkitFontData = "./node_modules/pdfkit/js/data/**/*";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Keep pdfkit external so __dirname resolves to real font .afm files at runtime.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/ledger/statement-pdf": [pdfkitFontData],
    "/api/paytm/csv-to-pdf": [pdfkitFontData],
    "/api/invoice/pdf": [pdfkitFontData],
    "/api/hsn/catalog-pdf": [pdfkitFontData],
    "/api/gstin/directory-pdf": [pdfkitFontData],
  },
  async redirects() {
    return [{ source: "/primary", destination: "/party", permanent: false }];
  },
};

export default nextConfig;
