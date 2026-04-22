import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { THEME_COOKIE_NAME, resolveThemeMode } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ONDIX",
    template: "%s | ONDIX",
  },
  description: "Base estrutural e visual inicial do sistema ONDIX.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = resolveThemeMode(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-theme={theme}
      className={theme === "dark" ? "dark" : undefined}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
