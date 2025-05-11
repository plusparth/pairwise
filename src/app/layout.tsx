import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pairwise Media Rankings",
  description: "Rank movies and TV shows through pairwise comparisons",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
