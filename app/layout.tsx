import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Premura — Revenue attribution for B2B",
  description:
    "Premura unifies pipeline, ad spend, and product usage into a single source of truth. Join the private beta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
