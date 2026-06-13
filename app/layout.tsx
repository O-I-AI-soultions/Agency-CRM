import type { Metadata, Viewport } from "next";
import { Rubik, Sora } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { getCurrentPartner } from "@/lib/auth-server";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "O-I CRM",
  description: "מערכת ניהול לידים ולקוחות - O-I",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const partner = await getCurrentPartner();

  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {partner ? (
          <>
            <Sidebar partner={partner} />
            <main className="min-h-screen px-4 py-8 pt-20 sm:px-6 md:py-8 md:pr-8 md:pl-[17rem] lg:pl-[18rem]">
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
