import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WannaCram",
  description: "AI-powered study assistant for exam preparation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
