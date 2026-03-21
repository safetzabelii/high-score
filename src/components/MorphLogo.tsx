"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

const singleHeartSrc = [
  ".XX...XX.",
  "XXXX.XXXX",
  "XXXXXXXXX",
  "XXXXXXXXX",
  "XXXXXXXXX",
  ".XXXXXXX.",
  "..XXXXX..",
  "...XXX...",
  "....X...."
];

const textSrc = [
  "X...X .X. .XXXX X...X .XXXX .XXXX .XXX. XXXX. XXXXX",
  "X...X .X. X.... X...X X.... X.... X...X X...X X....",
  "XXXXX .X. X.XXX XXXXX .XXX. X.... X...X XXXX. XXX..",
  "X...X .X. X...X X...X ....X X.... X...X X..X. X....",
  "X...X .X. .XXXX X...X XXXX. .XXXX .XXX. X...X XXXXX"
];

const CELL = 3;
const W = 180;
const H = 40;
const PIXEL = 2;

interface Pt {
  hx: number; hy: number;
  tx: number; ty: number;
  hasText: boolean;
  // runtime
  x: number; y: number;
  color: string;
  opacity: number;
  scaleX: number;
}

function buildPixels(): Pt[] {
  const heartCoords: { x: number; y: number }[] = [];
  for (let h = 0; h < 3; h++) {
    const ox = h * 13;
    singleHeartSrc.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'X') heartCoords.push({ x: x + ox, y });
      }
    });
  }

  const textGrid = textSrc.map(r => r.split(' ').join('.'));
  const textCoords: { x: number; y: number }[] = [];
  textGrid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'X') textCoords.push({ x, y });
    }
  });

  const cx = W / 2, cy = H / 2;
  const hsx = cx - (35 * CELL) / 2, hsy = cy - (9 * CELL) / 2;
  const tsx = cx - (51 * CELL) / 2, tsy = cy - (5 * CELL) / 2;

  // Shuffle text coords
  const shuffled = [...textCoords].sort(() => Math.random() - 0.5);

  const total = Math.max(heartCoords.length, shuffled.length);
  const pts: Pt[] = [];

  for (let i = 0; i < total; i++) {
    const hc = heartCoords[i];
    const tc = shuffled[i];
    pts.push({
      hx: hc ? hsx + hc.x * CELL : cx,
      hy: hc ? hsy + hc.y * CELL : cy,
      tx: tc ? tsx + tc.x * CELL : cx,
      ty: tc ? tsy + tc.y * CELL : cy,
      hasText: !!tc,
      x: cx, y: cy,
      color: '#ff0055',
      opacity: 0,
      scaleX: 1,
    });
  }
  return pts;
}

export function MorphLogo({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pt[]>([]);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<'idle' | 'to-hearts' | 'glitch' | 'to-text' | 'done'>('idle');
  const phaseStartRef = useRef(0);
  const isAnimatingRef = useRef(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, W * dpr, H * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);
    for (const p of pixelsRef.current) {
      if (p.opacity < 0.01) continue;
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, PIXEL * p.scaleX, PIXEL);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }, []);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

  const animate = useCallback((time: number) => {
    const phase = phaseRef.current;
    const elapsed = time - phaseStartRef.current;
    const pts = pixelsRef.current;

    if (phase === 'to-hearts') {
      // Original: 0.5s CSS transition + 1.2s hold = ~1700ms total
      const animDur = 500;
      const holdDur = 1200;
      const totalDur = animDur + holdDur;
      const t = Math.min(elapsed / animDur, 1);
      const e = easeOut(t);
      for (const p of pts) {
        p.x = lerp(p.x, p.hx, e * 0.3);
        p.y = lerp(p.y, p.hy, e * 0.3);
        p.opacity = Math.min(p.opacity + 0.08, 1);
        p.color = '#ff0055';
        p.scaleX = 1;
      }
      if (t >= 1) {
        for (const p of pts) { p.x = p.hx; p.y = p.hy; p.opacity = 1; }
      }
      if (elapsed >= totalDur) {
        phaseRef.current = 'glitch';
        phaseStartRef.current = time;
      }
    } else if (phase === 'glitch') {
      // Original: 7 flashes at 50ms = 350ms
      const dur = 350;
      const t = Math.min(elapsed / dur, 1);
      for (const p of pts) {
        const nx = (Math.random() - 0.5) * 40;
        const ny = (Math.random() - 0.5) * 5;
        const useText = Math.random() > 0.7 && p.hasText;
        const bx = useText ? p.tx : p.hx;
        const by = useText ? p.ty : p.hy;
        p.x = bx + nx;
        p.y = by + ny;
        p.scaleX = Math.random() > 0.8 ? Math.random() * 4 + 1 : 1;
        const r = Math.random();
        p.color = r > 0.8 ? '#ff0055' : r > 0.4 ? '#ffffff' : '#ff0055';
        p.opacity = Math.random() > 0.2 ? 1 : 0.2;
      }
      if (t >= 1) {
        phaseRef.current = 'to-text';
        phaseStartRef.current = time;
      }
    } else if (phase === 'to-text') {
      // Original: 0.4s CSS transition with spring easing + 0.8s settle
      const dur = 800;
      const t = Math.min(elapsed / dur, 1);
      const e = easeOut(t);
      for (const p of pts) {
        if (p.hasText) {
          p.x = lerp(p.x, p.tx, e * 0.15);
          p.y = lerp(p.y, p.ty, e * 0.15);
          p.opacity = Math.min(p.opacity + 0.04, 1);
          p.color = '#ff0055';
          p.scaleX = lerp(p.scaleX, 1, e * 0.2);
        } else {
          p.opacity = Math.max(p.opacity - 0.04, 0);
        }
      }
      if (t >= 1) {
        for (const p of pts) {
          if (p.hasText) {
            p.x = p.tx; p.y = p.ty; p.opacity = 1; p.color = '#ff0055'; p.scaleX = 1;
          } else {
            p.opacity = 0;
          }
        }
        phaseRef.current = 'done';
        isAnimatingRef.current = false;
      }
    }

    draw();

    if (phaseRef.current !== 'done' && phaseRef.current !== 'idle') {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [draw]);

  const play = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const pts = pixelsRef.current;
    const cx = W / 2, cy = H / 2;

    // scatter from center
    for (const p of pts) {
      p.x = cx + (Math.random() - 0.5) * 60;
      p.y = cy + (Math.random() - 0.5) * 30;
      p.opacity = 0;
      p.scaleX = 1;
      p.color = '#ff0055';
    }

    phaseRef.current = 'to-hearts';
    phaseStartRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    pixelsRef.current = buildPixels();
    play();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [play]);

  return (
    <div
      className={cn("relative flex flex-col items-center justify-center", className)}
      onMouseEnter={play}
    >
      <div className="relative w-[180px] h-[40px] cursor-pointer shrink-0">
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
      </div>
    </div>
  );
}
