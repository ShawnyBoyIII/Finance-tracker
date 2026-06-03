import type { Metadata } from "next";
import "./globals.css";
import { FinanceProvider } from "@/context/FinanceContext";

export const metadata: Metadata = {
  title: "Free Budget Tracker",
  description: "A free, easy-to-use, and private budget tracker that runs entirely in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <FinanceProvider>
          {children}
        </FinanceProvider>
      </body>
    </html>
  );
}
