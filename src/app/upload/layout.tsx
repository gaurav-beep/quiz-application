import "../../globals.css";

export default function UploadLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-100 antialiased font-sans">
        <header className="bg-blue-600 text-white p-4 text-center font-bold">
          Upload Page
        </header>
        <main className="container mx-auto p-6">{children}</main>
        <footer className="bg-blue-600 text-white p-4 text-center">
          © 2025 Quiz Application
        </footer>
      </body>
    </html>
  );
}
