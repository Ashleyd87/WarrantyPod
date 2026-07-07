import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Product Warranty & Serial Vault",
    short_name: "Warranty Vault",
    description:
      "Receipts, serial numbers and warranty deadlines in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f8",
    theme_color: "#12756b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
