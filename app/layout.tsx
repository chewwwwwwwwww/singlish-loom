import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Singlish Loom — small words, big Singapore energy",
  description: "Weave a Singlish phrase into a sourced meaning, an imagined myth, and a little story. Add your voice to our collective kopitiam wall.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
