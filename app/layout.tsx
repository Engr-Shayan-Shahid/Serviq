import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/shared/NavigationProgress";

export const metadata: Metadata = {
  title: "Restaurant SaaS",
  description: "Restaurant ordering and management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans")}>
      <body className="font-sans antialiased">
        <NavigationProgress />
        {children}
        <Toaster position="bottom-right" richColors expand={false} />
      </body>
    </html>
  );
}
