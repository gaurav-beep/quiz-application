import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCQ Quiz Application",
  description: "Interactive Multiple Choice Question Quiz Application with PDF support",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
