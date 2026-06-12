import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { getCurrentPartner } from "@/lib/auth-server";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "O-I CRM",
  description: "מערכת ניהול לידים ולקוחות - O-I",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const partner = await getCurrentPartner();

  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {partner ? (
          <>
            <Sidebar partner={partner} />
            <main className="min-h-screen px-4 py-8 pt-20 sm:px-6 md:py-8 md:pr-8 md:pl-[18rem] lg:pl-[19rem]">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
