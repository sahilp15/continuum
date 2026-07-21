import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Continuum — Your context, everywhere.",
    template: "%s · Continuum",
  },
  description:
    "Continuum gives ChatGPT, Claude, Gemini, and the tools you already use one shared, user-controlled understanding of who you are and what you're working on. Never brief an AI twice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
