import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme";
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
    // suppressHydrationWarning: next-themes stamps data-theme on <html> before
    // hydration (theme is unknowable server-side), which is expected.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
