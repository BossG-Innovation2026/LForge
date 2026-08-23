"use client";

import { useEffect, useState } from "react";
import {
  THEMES,
  loadSavedTheme,
  saveTheme,
  applyTheme,
  getTheme,
  ThemePicker,
  type ThemeId,
} from "@/lib/themes";

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("matrix");

  useEffect(() => {
    const id = loadSavedTheme();
    setThemeId(id);
    applyTheme(getTheme(id));
  }, []);

  function handleChange(id: ThemeId) {
    setThemeId(id);
    saveTheme(id);
    applyTheme(getTheme(id));
  }

  const theme = getTheme(themeId);

  return (
    <>
      <div className="fixed right-3 top-3 z-50">
        <ThemePicker current={themeId} onChange={handleChange} />
      </div>

      {/* Inject theme-aware background layers */}
      <style>{`
        body::before {
          background-image:
            linear-gradient(var(--lf-grid, rgba(0,255,156,0.05)) 1px, transparent 1px),
            linear-gradient(90deg, var(--lf-grid, rgba(0,255,156,0.05)) 1px, transparent 1px);
        }
        body::after {
          background:
            radial-gradient(700px 420px at 12% -6%, var(--lf-glow-a, rgba(0,255,156,0.11)), transparent 70%),
            radial-gradient(560px 380px at 96% 108%, var(--lf-glow-b, rgba(0,255,156,0.06)), transparent 70%);
        }
        [data-theme="chalk"] body::before { opacity: 0.6; }
        [data-theme="chalk"] .lf-panel { background: rgba(248,250,252,0.9); border-color: rgba(29,78,216,0.18); }
        [data-theme="chalk"] .lf-input { background: rgba(255,255,255,0.8); color: #1e293b; border-color: rgba(29,78,216,0.25); }
        [data-theme="chalk"] .lf-input::placeholder { color: #94a3b8; }
        [data-theme="chalk"] .lf-label { color: rgba(29,78,216,0.7); }
        [data-theme="chalk"] ::selection { background: rgba(29,78,216,0.15); color: #1e293b; }
      `}</style>

      {children}
    </>
  );
}
