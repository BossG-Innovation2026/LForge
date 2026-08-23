"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ClickSpark {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  hue: number;
  size: number;
}

export default function CreateNotebookButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sparks, setSparks] = useState<ClickSpark[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sparkIdRef = useRef(0);

  const spawnClickSparks = useCallback((e: React.MouseEvent) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const newSparks: ClickSpark[] = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const dist = 50 + Math.random() * 60;
      newSparks.push({
        id: sparkIdRef.current++,
        x: cx,
        y: cy,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 20,
        hue: 15 + Math.random() * 35,
        size: 2 + Math.random() * 3,
      });
    }
    setSparks((prev) => [...prev, ...newSparks]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => !newSparks.find((n) => n.id === s.id)));
    }, 550);
  }, []);

  async function handleClick(e: React.MouseEvent) {
    if (creating) return;
    spawnClickSparks(e);
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        notebook?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.notebook) {
        throw new Error(data.error ?? "Could not create the lesson plan.");
      }
      router.push(`/notebook/${data.notebook.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCreating(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <div className="relative w-full">
        {/* Outer smoldering glow */}
        <div className="pointer-events-none absolute -inset-2 animate-pulse" style={{
          background: "radial-gradient(ellipse at center, rgba(255,120,20,0.3) 0%, rgba(255,60,0,0.1) 50%, transparent 80%)",
          animationDuration: "2s",
        }} />
        <div className="pointer-events-none absolute -inset-4 animate-pulse" style={{
          background: "radial-gradient(ellipse at center, rgba(255,80,0,0.12) 0%, transparent 70%)",
          animationDuration: "3s",
          animationDelay: "0.5s",
        }} />

        {/* Rising smoke */}
        <div className="pointer-events-none absolute -top-16 left-0 right-0 h-16 overflow-hidden">
          <span className="smoke-p" style={{ left: "15%", animationDelay: "0s" }} />
          <span className="smoke-p" style={{ left: "35%", animationDelay: "1.2s" }} />
          <span className="smoke-p" style={{ left: "55%", animationDelay: "0.6s" }} />
          <span className="smoke-p" style={{ left: "75%", animationDelay: "1.8s" }} />
          <span className="smoke-p" style={{ left: "25%", animationDelay: "2.4s" }} />
          <span className="smoke-p" style={{ left: "65%", animationDelay: "3s" }} />
          <span className="smoke-p" style={{ left: "45%", animationDelay: "3.6s" }} />
          <span className="smoke-p" style={{ left: "85%", animationDelay: "0.9s" }} />
          <span className="smoke-p" style={{ left: "10%", animationDelay: "2s" }} />
        </div>

        <button
          ref={btnRef}
          onClick={handleClick}
          disabled={creating}
          className="strike-btn relative w-full overflow-hidden rounded-none px-8 py-5 font-mono text-sm font-semibold uppercase tracking-wider text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, #ff6a00 0%, #cc3300 50%, #991a00 100%)",
            boxShadow: "0 0 30px rgba(255,80,0,0.4), 0 0 60px rgba(255,40,0,0.2), inset 0 1px 0 rgba(255,200,100,0.3)",
            textShadow: "0 0 10px rgba(255,200,100,0.8)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 animate-pulse" style={{
            background: "linear-gradient(180deg, rgba(255,200,100,0.15) 0%, transparent 50%, rgba(255,40,0,0.1) 100%)",
            animationDuration: "1.5s",
          }} />

          {creating ? (
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Forging…
            </span>
          ) : (
            <span className="relative z-10">Strike while it&apos;s hot.</span>
          )}
        </button>

        {/* Click sparks */}
        {sparks.map((s) => (
          <span
            key={s.id}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              background: `hsl(${s.hue}, 100%, 70%)`,
              boxShadow: `0 0 ${s.size * 2}px hsl(${s.hue}, 100%, 60%)`,
              animation: "spark-fly 0.5s ease-out forwards",
              "--tx": `${s.tx}px`,
              "--ty": `${s.ty}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {error && (
        <p className="font-mono text-xs uppercase tracking-wider text-red-400">{error}</p>
      )}

      <style>{`
        .strike-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.08) 50%, transparent 100%);
          animation: smolder-shift 3s ease-in-out infinite;
        }
        @keyframes smolder-shift {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        @keyframes spark-fly {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(0.1);
          }
        }
        .smoke-p {
          position: absolute;
          bottom: 0;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(180, 180, 180, 0.25);
          filter: blur(3px);
          animation: smoke-rise 4s ease-out infinite;
          opacity: 0;
        }
        @keyframes smoke-rise {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0) scale(1);
          }
          10% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) translateX(${15}px) scale(3);
          }
        }
      `}</style>
    </div>
  );
}
