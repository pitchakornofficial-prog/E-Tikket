import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Tikket",
  description: "Local events and concert ticketing platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
