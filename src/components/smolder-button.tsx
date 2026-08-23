"use client";

import { useState, useRef, useCallback, type ReactNode, type ButtonHTMLAttributes } from "react";

interface ClickSpark {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  hue: number;
  size: number;
}

interface SmolderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "forge" | "ghost" | "danger" | "muted";
  sparkCount?: number;
}

export default function SmolderButton({
  children,
  variant = "forge",
  sparkCount = 16,
  className = "",
  disabled,
  onClick,
  ...rest
}: SmolderButtonProps) {
  const [sparks, setSparks] = useState<ClickSpark[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sparkIdRef = useRef(0);

  const spawnSparks = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const newSparks: ClickSpark[] = [];
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.3;
        const dist = 30 + Math.random() * 40;
        newSparks.push({
          id: sparkIdRef.current++,
          x: cx,
          y: cy,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist - 12,
          hue: 15 + Math.random() * 35,
          size: 1.5 + Math.random() * 2.5,
        });
      }
      setSparks((prev) => [...prev, ...newSparks]);
      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => !newSparks.find((n) => n.id === s.id)));
      }, 500);
    },
    [sparkCount],
  );

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    spawnSparks(e);
    onClick?.(e);
  }

  const variantStyles: Record<string, string> = {
    forge: `relative overflow-hidden text-white transition disabled:cursor-not-allowed disabled:opacity-40`,
    ghost: `relative overflow-hidden text-zinc-300 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-40`,
    danger: `relative overflow-hidden text-white transition disabled:cursor-not-allowed disabled:opacity-40`,
    muted: `relative overflow-hidden text-zinc-400 hover:text-zinc-200 transition disabled:cursor-not-allowed disabled:opacity-40`,
  };

  const variantBg: Record<string, React.CSSProperties> = {
    forge: {
      background: "linear-gradient(180deg, #ff6a00 0%, #cc3300 50%, #991a00 100%)",
      boxShadow: "0 0 20px rgba(255,80,0,0.3), inset 0 1px 0 rgba(255,200,100,0.2)",
      textShadow: "0 0 8px rgba(255,200,100,0.6)",
    },
    ghost: {
      background: "transparent",
      boxShadow: "none",
    },
    danger: {
      background: "linear-gradient(180deg, #cc2200 0%, #991100 50%, #660a00 100%)",
      boxShadow: "0 0 15px rgba(200,30,0,0.25), inset 0 1px 0 rgba(255,100,80,0.2)",
      textShadow: "0 0 6px rgba(255,100,80,0.5)",
    },
    muted: {
      background: "rgba(255,255,255,0.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    },
  };

  return (
    <div className="relative flex w-full">
      {/* Smolder glow - only for forge and danger */}
      {(variant === "forge" || variant === "danger") && (
        <>
          <div
            className="pointer-events-none absolute -inset-1 animate-pulse opacity-60"
            style={{
              background: variant === "danger"
                ? "radial-gradient(ellipse at center, rgba(200,30,0,0.3) 0%, transparent 70%)"
                : "radial-gradient(ellipse at center, rgba(255,120,20,0.3) 0%, transparent 70%)",
              animationDuration: "2s",
            }}
          />
          {/* Rising smoke */}
          <div className="pointer-events-none absolute -top-12 left-0 right-0 h-12 overflow-hidden">
            <span className="smoke-p" style={{ left: "20%", animationDelay: "0s" }} />
            <span className="smoke-p" style={{ left: "50%", animationDelay: "1s" }} />
            <span className="smoke-p" style={{ left: "80%", animationDelay: "2s" }} />
            <span className="smoke-p" style={{ left: "35%", animationDelay: "0.5s" }} />
            <span className="smoke-p" style={{ left: "65%", animationDelay: "1.5s" }} />
          </div>
        </>
      )}

      <button
        ref={btnRef}
        onClick={handleClick}
        disabled={disabled}
        className={`${variantStyles[variant]} ${className}`}
        style={variantBg[variant]}
        {...rest}
      >
        {/* Inner shimmer - forge only */}
        {variant === "forge" && (
          <div
            className="pointer-events-none absolute inset-0 animate-pulse"
            style={{
              background: "linear-gradient(180deg, rgba(255,200,100,0.12) 0%, transparent 50%, rgba(255,40,0,0.08) 100%)",
              animationDuration: "1.5s",
            }}
          />
        )}

        <span className="relative z-10">{children}</span>
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
            animation: "spark-fly 0.45s ease-out forwards",
            "--tx": `${s.tx}px`,
            "--ty": `${s.ty}px`,
          } as React.CSSProperties}
        />
      ))}

      <style>{`
        .smoke-p {
          position: absolute;
          bottom: 0;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(160, 160, 160, 0.2);
          filter: blur(3px);
          animation: smoke-rise 3.5s ease-out infinite;
          opacity: 0;
        }
        @keyframes smoke-rise {
          0% { opacity: 0; transform: translateY(0) translateX(0) scale(1); }
          10% { opacity: 0.4; }
          50% { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-50px) translateX(10px) scale(2.5); }
        }
        @keyframes spark-fly {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.1); }
        }
      `}</style>
    </div>
  );
}
