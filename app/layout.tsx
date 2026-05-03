import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Empty NYC Carriage",
  description: "Estimated less crowded subway platform zones.",
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
