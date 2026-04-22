"use client";

import { MoonStar, SunMedium } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggleButton() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      icon={isDark ? SunMedium : MoonStar}
      variant="ghost"
      onClick={toggleTheme}
    >
      {isDark ? "Modo claro" : "Modo escuro"}
    </Button>
  );
}
