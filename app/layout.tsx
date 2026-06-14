import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Hebrew, IBM_Plex_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { getCurrentPartner } from "@/lib/auth-server";
import "./globals.css";

const plexSans = IBM_Plex_Sans_Hebrew({
  variable: "--font-plex-sans",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "O-I CRM",
  description: "מערכת ניהול לידים ולקוחות - O-I",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Inline, render-blocking: read the saved theme before first paint so there's
// no flash of the wrong theme. Defaults to dark (the system's base theme).
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const partner = await getCurrentPartner();

  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} dark h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {partner ? (
          <>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              דלג לתוכן הראשי
            </a>
            <Sidebar partner={partner} />
            <main
              id="main-content"
              className="min-h-screen px-4 py-8 pt-20 sm:px-6 md:py-8 md:pr-8 md:pl-[17rem] lg:pl-[18rem]"
            >
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
