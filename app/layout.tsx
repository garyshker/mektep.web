import type { Metadata } from "next";
import { Nunito, Inter } from "next/font/google";
import "./globals.css";

// Display — rounded, friendly (has Cyrillic for kk/ru)
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800", "900"],
  display: "swap",
});

// Body / UI — modern grotesk with full Cyrillic (Manrope lacks Cyrillic)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ushkyn",
  description: "Балаларға арналған интерактивті оқу платформасы",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="kk"
      className={`${nunito.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('mektep_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden" style={{ background: 'var(--background)' }}>{children}</body>
    </html>
  );
}
