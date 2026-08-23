"use client";

import { useEffect } from "react";
import { applyTheme, getTheme } from "@/lib/themes";
import ForgeBackground from "@/components/forge-background";

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getTheme("forge"));
  }, []);

  return (
    <>
      <ForgeBackground />
      {children}
    </>
  );
}
