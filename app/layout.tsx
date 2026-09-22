import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

/* Three roles, three faces:
   - Space Grotesk carries headings. Its widened, slightly mechanical caps
     read like the labels stencilled on test equipment.
   - Inter carries running prose, where plain legibility wins.
   - JetBrains Mono carries every number and code: the clock, coin counts,
     access codes, flags. Real tabular figures, so the timer never jitters. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rewired 2026 — Hardware CTF",
  description:
    "A 45-minute hardware capture-the-flag run by the SNUC Potential Robotics Club. Sniff the air, clone the card, take the key.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Browser extensions stamp their own attributes onto <html> before React
    // hydrates (ad blockers, focus timers, password managers), which React
    // otherwise reports as a hydration mismatch it cannot patch up. Scoped to
    // this one element so real mismatches inside the app still surface.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
