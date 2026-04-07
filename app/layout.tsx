import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cookie-kmt LINE CRM",
  description: "縮毛矯正・髪質改善専門店 cookie-kmt LINE CRM System",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
