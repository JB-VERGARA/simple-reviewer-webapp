import type { Metadata } from "next";
import "./globals.css";
import PasscodeGate from "@/components/PasscodeGate";

export const metadata: Metadata = {
  title: "Reviewer",
  description: "Simple review app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PasscodeGate>{children}</PasscodeGate>
      </body>
    </html>
  );
}