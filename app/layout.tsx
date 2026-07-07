import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Warranty Vault",
    template: "%s · Warranty Vault",
  },
  description:
    "Product Warranty & Serial Vault — receipts, serial numbers and warranty deadlines in one place.",
  applicationName: "Warranty Vault",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Warranty Vault",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12756b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
