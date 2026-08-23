"use client";

import { useEffect, useState } from "react";
import SmolderButton from "@/components/smolder-button";

export type ThemeId =
  | "forge"
  | "matrix"
  | "midnight"
  | "aurora"
  | "ember"
  | "ocean"
  | "chalk";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  accent: string;
  bg: string;
  fg: string;
  line: string;
  gridColor: string;
  glowA: string;
  glowB: string;
}

export const THEMES: Theme[] = [
  {
    id: "forge",
    name: "Forge",
    description: "Flame-dark, smoldering iron",
    accent: "#ff6a00",
    bg: "#0a0400",
    fg: "#f5e6d0",
    line: "rgba(255,106,0,0.15)",
    gridColor: "rgba(255,106,0,0.06)",
    glowA: "rgba(255,106,0,0.12)",
    glowB: "rgba(255,60,0,0.07)",
  },
  {
    id: "matrix",
    name: "Matrix",
    description: "Classic green-on-black terminal",
    accent: "#00ff9c",
    bg: "#050807",
    fg: "#d6e8dd",
    line: "rgba(0,255,156,0.14)",
    gridColor: "rgba(0,255,156,0.05)",
    glowA: "rgba(0,255,156,0.11)",
    glowB: "rgba(0,255,156,0.06)",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep blue, cool and calm",
    accent: "#60a5fa",
    bg: "#03070f",
    fg: "#cdd8f0",
    line: "rgba(96,165,250,0.14)",
    gridColor: "rgba(96,165,250,0.05)",
    glowA: "rgba(96,165,250,0.11)",
    glowB: "rgba(96,165,250,0.06)",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Purple-to-teal gradient glow",
    accent: "#a78bfa",
    bg: "#06030f",
    fg: "#ddd6fe",
    line: "rgba(167,139,250,0.14)",
    gridColor: "rgba(167,139,250,0.05)",
    glowA: "rgba(167,139,250,0.11)",
    glowB: "rgba(45,212,191,0.07)",
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm amber fire tones",
    accent: "#fb923c",
    bg: "#0c0602",
    fg: "#fde8d0",
    line: "rgba(251,146,60,0.14)",
    gridColor: "rgba(251,146,60,0.05)",
    glowA: "rgba(251,146,60,0.11)",
    glowB: "rgba(251,146,60,0.06)",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cyan depths, cool and deep",
    accent: "#22d3ee",
    bg: "#020b0f",
    fg: "#caf0f8",
    line: "rgba(34,211,238,0.14)",
    gridColor: "rgba(34,211,238,0.05)",
    glowA: "rgba(34,211,238,0.11)",
    glowB: "rgba(34,211,238,0.06)",
  },
  {
    id: "chalk",
    name: "Chalk",
    description: "Light mode, clean and bright",
    accent: "#1d4ed8",
    bg: "#f8fafc",
    fg: "#1e293b",
    line: "rgba(29,78,216,0.14)",
    gridColor: "rgba(29,78,216,0.05)",
    glowA: "rgba(29,78,216,0.06)",
    glowB: "rgba(29,78,216,0.04)",
  },
];

const STORAGE_KEY = "lf-theme";
export const DEFAULT_THEME_ID: ThemeId = "forge";

export function getTheme(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty("--lf-bg", theme.bg);
  root.style.setProperty("--lf-fg", theme.fg);
  root.style.setProperty("--lf-accent", theme.accent);
  root.style.setProperty("--lf-line", theme.line);
  root.style.setProperty("--lf-grid", theme.gridColor);
  root.style.setProperty("--lf-glow-a", theme.glowA);
  root.style.setProperty("--lf-glow-b", theme.glowB);
  root.setAttribute("data-theme", theme.id);
  if (theme.id === "chalk") {
    root.style.colorScheme = "light";
  } else {
    root.style.colorScheme = "dark";
  }
}

export function loadSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES.find((t) => t.id === saved)) return saved;
  } catch { /* ignore */ }
  return DEFAULT_THEME_ID;
}

export function saveTheme(id: ThemeId) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const id = loadSavedTheme();
    applyTheme(getTheme(id));
  }, []);
  return <>{children}</>;
}

export function ThemePicker({
  current,
  onChange,
}: {
  current: ThemeId;
  onChange: (id: ThemeId) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <SmolderButton
        type="button"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        className="flex items-center gap-1.5 rounded-none border border-[var(--lf-accent)]/25 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--lf-accent)]/70 transition hover:border-[var(--lf-accent)]/60 hover:bg-[var(--lf-accent)]/8 hover:text-[var(--lf-accent)]"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        </svg>
        {getTheme(current).name}
      </SmolderButton>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 border border-[var(--lf-accent)]/25 bg-[var(--lf-bg)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="border-b border-[var(--lf-accent)]/15 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--lf-accent)]/60">
                Theme
              </p>
            </div>
            {THEMES.map((theme) => (
              <SmolderButton
                key={theme.id}
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange(theme.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--lf-accent)]/8 ${
                  theme.id === current ? "bg-[var(--lf-accent)]/10" : ""
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-white/10"
                  style={{ background: theme.accent }}
                />
                <div className="min-w-0">
                  <p className="font-mono text-xs font-medium" style={{ color: theme.id === current ? theme.accent : "var(--lf-fg)" }}>
                    {theme.name}
                    {theme.id === current && <span className="ml-1.5 opacity-60">✓</span>}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500">{theme.description}</p>
                </div>
              </SmolderButton>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
