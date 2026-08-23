"use client";

import { useState, useEffect } from "react";
import SmolderButton from "@/components/smolder-button";

const VALID_TICKETS: Record<string, { daysValid?: number }> = {
  "305872": { daysValid: 3 },
  "031805": { daysValid: undefined },
};

const STORAGE_KEY = "lf-ticket";
const STORAGE_TIME_KEY = "lf-ticket-time";

function isTicketValid(ticket: string): boolean {
  const config = VALID_TICKETS[ticket];
  if (!config) return false;
  if (config.daysValid === undefined) return true;
  try {
    const storedTime = localStorage.getItem(STORAGE_TIME_KEY);
    const storedTicket = localStorage.getItem(STORAGE_KEY);
    if (storedTicket === ticket && storedTime) {
      const elapsed = Date.now() - parseInt(storedTime, 10);
      const maxMs = config.daysValid * 24 * 60 * 60 * 1000;
      return elapsed < maxMs;
    }
  } catch { /* ignore */ }
  return true;
}

function saveTicket(ticket: string) {
  try {
    localStorage.setItem(STORAGE_KEY, ticket);
    localStorage.setItem(STORAGE_TIME_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export default function TicketGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isTicketValid(stored)) {
        setAllowed(true);
        return;
      }
    } catch { /* ignore */ }
    setAllowed(false);
  }, []);

  function handleEnter() {
    const code = input.trim();
    if (!code) {
      setError("Enter your entrance ticket.");
      return;
    }
    if (isTicketValid(code)) {
      saveTicket(code);
      setAllowed(true);
    } else {
      setError("Invalid or expired ticket.");
    }
  }

  if (allowed === null) return null;
  if (allowed) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: "var(--lf-bg)" }}>
      <div className="lf-panel lf-frame relative w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <span className="forge-title mb-3 inline-block font-mono text-3xl font-bold uppercase tracking-wider">
            LessonForge
          </span>
          <p className="font-mono text-xs text-zinc-500">Enter entrance ticket to proceed</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleEnter()}
            placeholder="Ticket number"
            className="lf-input w-full px-4 py-3 text-center font-mono text-sm tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-center font-mono text-xs uppercase tracking-wider text-red-400">{error}</p>
          )}
          <SmolderButton
            variant="forge"
            onClick={handleEnter}
            className="w-full rounded-none px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest"
          >
            Enter
          </SmolderButton>
        </div>

        <style>{`
          .forge-title {
            background: linear-gradient(180deg, #fff5eb 0%, #ffcc66 25%, #ff6a00 55%, #cc3300 80%, #991a00 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 0 8px rgba(255,106,0,0.6)) drop-shadow(0 0 20px rgba(255,60,0,0.3));
          }
        `}</style>
      </div>
    </div>
  );
}
