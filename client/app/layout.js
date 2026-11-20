import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: { default: "Library", template: "%s | Library"},
  description: "Library Management: books, loans, reservations and fines",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-5xl px-4 py-4 tex-sm text-slate-500">
              Library Management. Built with Next.js, Express and MongoDB.{" "}
              <a
              href="https://github.com/patilharsh03/library-management"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-700 hover:underline"
              >
                Source code
              </a>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
