import type { Metadata } from "next";
import "./globals.css";
import "./prototype.css";

export const metadata: Metadata = {
  title: "E-Tikket",
  description: "Local events and concert ticketing platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="light" style={{ colorScheme: "light" }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  localStorage.removeItem('theme');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white text-neutral-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
