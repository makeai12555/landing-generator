import type { Metadata } from "next";
import { Inter, Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "CourseFlow | הרשמה לקורס",
  description: "דף הרשמה לקורס",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Material Symbols for icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${notoSansHebrew.variable} antialiased bg-gray-50 text-gray-900 min-h-screen`}
        style={{ fontFamily: "var(--font-inter), var(--font-noto-hebrew), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
