import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Tikket",
  description: "Local events and concert ticketing platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark bg-black">
      <body className="bg-black text-white antialiased min-h-screen">{children}</body>
    </html>
  );
}
