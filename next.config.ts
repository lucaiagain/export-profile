import type { NextConfig } from "next";

const PDF_FILES = ["./assets/**", "./node_modules/pdfkit/js/standard-fonts/**", "./node_modules/pdfkit/js/data/**"];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // File letti dal disco o caricati dinamicamente durante la generazione del PDF, che il tracciamento
  // di Vercel non vede: font e loghi nostri, font standard e dati di pdfkit.
  outputFileTracingIncludes: {
    "/api/**": PDF_FILES,
    "/staff/**": PDF_FILES,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
