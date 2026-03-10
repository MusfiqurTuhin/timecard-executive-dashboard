import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { Clock } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Timecard Dashboard UX",
  description: "World class sexy timecard dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground`}>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center px-4">
              <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-lg tracking-tight">TimeFlow</span>
              </Link>
              <nav className="ml-auto flex items-center gap-6 text-sm font-medium">
                <Link href="/" className="transition-colors hover:text-primary">Dashboard</Link>
                <Link href="/analytics" className="transition-colors hover:text-primary text-muted-foreground">Analytics</Link>
                <Link href="/upload" className="transition-colors hover:text-primary text-muted-foreground">Upload</Link>
                <Link href="/settings" className="transition-colors hover:text-primary text-muted-foreground">Settings</Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 container mx-auto p-4 md:p-8">
            {children}
          </main>
        </div>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
