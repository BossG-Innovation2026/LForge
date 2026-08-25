import CreateNotebookButton from "@/components/create-notebook-button";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 flex flex-col items-center justify-center">
      <header className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-[var(--lf-accent)]/60 bg-[var(--lf-accent)]/10 font-mono text-sm font-bold text-[var(--lf-accent)] shadow-[0_0_18px_rgba(0,0,0,0.25)]">
            LF
          </span>
          <div className="flex flex-col justify-center text-left">
            <div className="relative inline-block">
              <h1 className="forge-title font-mono text-2xl font-bold uppercase leading-none tracking-[0.18em]">
                LessonForge
              </h1>
              <div className="forge-smoke">
                <span className="smoke-p" style={{ left: "20%", animationDelay: "0s" }} />
                <span className="smoke-p" style={{ left: "40%", animationDelay: "0.8s" }} />
                <span className="smoke-p" style={{ left: "60%", animationDelay: "1.6s" }} />
                <span className="smoke-p" style={{ left: "80%", animationDelay: "2.4s" }} />
                <span className="smoke-p" style={{ left: "30%", animationDelay: "3.2s" }} />
                <span className="smoke-p" style={{ left: "50%", animationDelay: "0.4s" }} />
                <span className="smoke-p" style={{ left: "70%", animationDelay: "1.2s" }} />
                <span className="smoke-p" style={{ left: "90%", animationDelay: "2s" }} />
                <span className="smoke-p" style={{ left: "10%", animationDelay: "2.8s" }} />
              </div>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">BOSS-G INNOVATIONS &copy; 2026</p>
          </div>
        </div>
        <p className="font-mono text-xs tracking-wide text-zinc-500">
          Forged by AI, Sharpened by Human Expertise
        </p>
      </header>

      <section className="lf-panel lf-frame relative w-full p-8">
        <p className="forge-title mx-auto text-center font-mono text-sm leading-relaxed">
          Pedagogical authority remains absolute: Review. Refine. Approve.
        </p>
        <div className="mt-6">
          <CreateNotebookButton />
        </div>
      </section>

      <style>{`
        .forge-title {
          background: linear-gradient(180deg, #fff5eb 0%, #ffcc66 25%, #ff6a00 55%, #cc3300 80%, #991a00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 8px rgba(255,106,0,0.6)) drop-shadow(0 0 20px rgba(255,60,0,0.3));
          animation: forge-flicker 3s ease-in-out infinite;
        }
        @keyframes forge-flicker {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(255,106,0,0.6)) drop-shadow(0 0 20px rgba(255,60,0,0.3)); }
          50% { filter: drop-shadow(0 0 12px rgba(255,150,0,0.8)) drop-shadow(0 0 30px rgba(255,80,0,0.5)); }
        }
        .forge-smoke {
          position: absolute;
          top: -8px;
          left: 0;
          right: 0;
          height: 20px;
          overflow: visible;
          pointer-events: none;
        }
        .forge-smoke .smoke-p {
          position: absolute;
          bottom: 0;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(180, 180, 180, 0.3);
          filter: blur(2px);
          animation: smoke-rise 3s ease-out infinite;
          opacity: 0;
        }
        @keyframes smoke-rise {
          0% { opacity: 0; transform: translateY(0) translateX(0) scale(1); }
          15% { opacity: 0.5; }
          50% { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-30px) translateX(8px) scale(2.5); }
        }
      `}</style>
    </div>
  );
}
