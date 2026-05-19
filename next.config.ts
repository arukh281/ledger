import type { NextConfig } from "next";

const pdfkitFontData = "./node_modules/pdfkit/js/data/**/*";

const nextConfig: NextConfig = {
  // Keep pdfkit external so __dirname resolves to real font .afm files at runtime.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/ledger/statement-pdf": [pdfkitFontData],
    "/api/paytm/csv-to-pdf": [pdfkitFontData],
  },
  async redirects() {
    return [{ source: "/", destination: "/primary", permanent: false }];
  },
};

export default nextConfig;
