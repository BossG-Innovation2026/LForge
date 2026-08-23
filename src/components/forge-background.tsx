"use client";

import { useEffect, useRef } from "react";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  brightness: number;
  hue: number;
}

export default function ForgeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const cvs: HTMLCanvasElement = el;
    const maybeCtx = cvs.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let animId: number;
    const sparks: Spark[] = [];
    let canvasW = cvs.width;
    let canvasH = cvs.height;

    function resize() {
      canvasW = window.innerWidth;
      canvasH = window.innerHeight;
      cvs.width = canvasW;
      cvs.height = canvasH;
    }
    resize();
    window.addEventListener("resize", resize);

    function getAccentColor(): string {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue("--lf-accent").trim() || "#00ff9c";
    }

    function hexToHue(hex: string): number {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      if (max !== min) {
        const d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
      }
      return Math.round(h * 360);
    }

    function spawnSpark() {
      const accent = getAccentColor();
      const baseHue = hexToHue(accent);
      const x = canvasW * 0.5 + (Math.random() - 0.5) * canvasW * 0.6;
      const y = canvasH + 10;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 1.5 + Math.random() * 3;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 80 + Math.random() * 120,
        size: 1 + Math.random() * 2,
        brightness: 0.5 + Math.random() * 0.5,
        hue: baseHue + (Math.random() - 0.5) * 30,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvasW, canvasH);

      if (Math.random() < 0.15) spawnSpark();
      if (Math.random() < 0.05) {
        for (let i = 0; i < 3; i++) spawnSpark();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.02;
        s.vx *= 0.99;

        const progress = s.life / s.maxLife;
        const alpha = s.brightness * (1 - progress) * (progress < 0.1 ? progress * 10 : 1);

        if (s.life >= s.maxLife || alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const glowSize = s.size * (1 + (1 - progress) * 3);
        const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowSize);
        gradient.addColorStop(0, `hsla(${s.hue}, 100%, 80%, ${alpha})`);
        gradient.addColorStop(0.4, `hsla(${s.hue}, 90%, 60%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${s.hue}, 80%, 40%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${s.hue}, 100%, 95%, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
