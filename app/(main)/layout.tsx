import type React from "react";
import { Header } from "@/components/header";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen px-4 mx-auto">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 lg:py-12">
        {children}
      </main>
      <footer className="border-t border-border/40 bg-muted/20 py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left font-medium">
            &copy; {new Date().getFullYear()} Price Tracker. All rights
            reserved.
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-primary/40 to-primary rounded-full md:hidden"></div>
        </div>
      </footer>
    </div>
  );
}
