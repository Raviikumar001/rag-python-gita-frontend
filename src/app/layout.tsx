import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./(core)/provider/query-provider";

export const metadata: Metadata = {
  title: "Gita Ai chat bot",
  description: "Gita Ai chat bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
