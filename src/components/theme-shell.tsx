import { useEffect } from "react";
import { applyTheme, getTheme } from "@/lib/themes";

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getTheme("forge"));
  }, []);

  return <>{children}</>;
}
