"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// --- 1. DEFINE THE PIXEL GRIDS ---
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

const CELL = 3; // Scaled down cell size for navbar

interface Coords {
  x: number;
  y: number;
  color?: string;
  shadow?: string;
  rx?: number;
  ry?: number;
}

export function MorphLogo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [pixelsData, setPixelsData] = useState<any[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // --- 2. EXTRACT COORDINATES & COLORS ---
    let heartCoords: Coords[] = [];
    let textCoords: Coords[] = [];

    // Red hearts
    const heartColors = ['#ff0055', '#ff0055', '#ff0055'];

    for (let h = 0; h < 3; h++) {
      let offsetX = h * (9 + 4);
      singleHeartSrc.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === 'X') {
            heartCoords.push({
              x: x + offsetX,
              y: y,
              color: heartColors[h],
              shadow: `0 0 4px ${heartColors[h]}`
            });
          }
        }
      });
    }

    const textGrid = textSrc.map(r => r.split(' ').join('.'));
    textGrid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'X') {
          textCoords.push({ x: x, y: y });
        }
      }
    });

    // --- 3. CALCULATE REAL SCREEN POSITIONS ---
    const C_WIDTH = 180; // Scaled down width
    const C_HEIGHT = 40; // Scaled down height
    const CENTER_X = C_WIDTH / 2;
    const CENTER_Y = C_HEIGHT / 2;

    const hStartX = CENTER_X - (35 * CELL) / 2;
    const hStartY = CENTER_Y - (9 * CELL) / 2;

    const tStartX = CENTER_X - (51 * CELL) / 2;
    const tStartY = CENTER_Y - (5 * CELL) / 2;

    heartCoords = heartCoords.map(c => ({
      ...c,
      rx: hStartX + c.x * CELL,
      ry: hStartY + c.y * CELL
    }));

    textCoords = textCoords.map(c => ({
      ...c,
      rx: tStartX + c.x * CELL,
      ry: tStartY + c.y * CELL,
      color: '#ff0055', // Red text instead of white
      shadow: `0 0 6px rgba(255, 0, 85, 0.8)`
    }));

    textCoords.sort(() => Math.random() - 0.5);

    const totalPixels = Math.max(heartCoords.length, textCoords.length);
    const newPixelsData = [];

    for (let i = 0; i < totalPixels; i++) {
        const el = document.createElement('div');
        el.className = 'absolute w-[2px] h-[2px] rounded-[1px]';
        layerRef.current?.appendChild(el);

        newPixelsData.push({
          el: el,
          hTarget: heartCoords[i],
          tTarget: textCoords[i] || null,
          scatter: {
            x: (Math.random() - 0.5) * 150,
            y: (Math.random() - 0.5) * 150
          }
        });
    }
    
    setPixelsData(newPixelsData);

    return () => {
        if (layerRef.current) {
            layerRef.current.innerHTML = '';
        }
    }
  }, []);

  const setToHearts = (animate: boolean, pixels: any[]) => {
    pixels.forEach(p => {
      if (!animate) {
        p.el.style.transition = 'none';
      } else {
        p.el.style.transition = `all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${Math.random() * 0.1}s`;
      }

      if (p.hTarget) {
          p.el.style.transform = `translate(${p.hTarget.rx}px, ${p.hTarget.ry}px) scale(1)`;
          p.el.style.backgroundColor = p.hTarget.color;
          p.el.style.boxShadow = p.hTarget.shadow;
          p.el.style.opacity = '1';
      }
    });
  };

  const setToText = (animate: boolean, pixels: any[]) => {
    pixels.forEach(p => {
      if (!animate) {
        p.el.style.transition = 'none';
      } else {
        p.el.style.transition = `all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${Math.random() * 0.05}s`;
      }

      if (p.tTarget) {
        p.el.style.transform = `translate(${p.tTarget.rx}px, ${p.tTarget.ry}px) scale(1)`;
        p.el.style.backgroundColor = p.tTarget.color;
        p.el.style.boxShadow = p.tTarget.shadow;
        p.el.style.opacity = '1';
      } else if (p.hTarget) {
        p.el.style.transform = `translate(${p.hTarget.rx + p.scatter.x}px, ${p.hTarget.ry + p.scatter.y}px) scale(0)`;
        p.el.style.opacity = '0';
      }
    });
  };

  const playSequence = () => {
    if (isAnimating || pixelsData.length === 0) return;
    setIsAnimating(true);

    setToHearts(false, pixelsData);

    setTimeout(() => {
      setToHearts(true, pixelsData);

      setTimeout(() => {
        if (containerRef.current) containerRef.current.classList.add('animate-glitch');

        let glitchFlashes = 0;
        let glitchInterval = setInterval(() => {
          pixelsData.forEach(p => {
            p.el.style.transition = 'none';

            const useTextTarget = Math.random() > 0.7 && p.tTarget;
            const baseTarget = useTextTarget ? p.tTarget : p.hTarget;

            if (baseTarget) {
                const nx = (Math.random() - 0.5) * 40;
                const ny = (Math.random() - 0.5) * 5;
                const scaleX = Math.random() > 0.8 ? (Math.random() * 4 + 1) : 1;

                p.el.style.transform = `translate(${baseTarget.rx + nx}px, ${baseTarget.ry + ny}px) scaleX(${scaleX})`;

                const rColor = Math.random();
                p.el.style.backgroundColor = rColor > 0.8 ? '#ff0055' : (rColor > 0.4 ? '#ffffff' : '#ff0055');
                p.el.style.opacity = Math.random() > 0.2 ? '1' : '0.2';
                p.el.style.boxShadow = 'none';
            }
          });

          glitchFlashes++;
          if (glitchFlashes > 6) {
            clearInterval(glitchInterval);
            if (containerRef.current) containerRef.current.classList.remove('animate-glitch');

            setToText(true, pixelsData);

            setTimeout(() => {
              setIsAnimating(false);
            }, 800);
          }
        }, 50);

      }, 1200);

    }, 50);
  };

  useEffect(() => {
    if (pixelsData.length > 0) {
        playSequence();
    }
  }, [pixelsData]);


  return (
    <div 
        className={cn("relative flex flex-col items-center justify-center", className)}
        onMouseEnter={() => {
            if (!isAnimating && pixelsData.length > 0) {
                playSequence();
            }
        }}
    >
      <div 
        id="logo-container" 
        ref={containerRef}
        className="relative w-[180px] h-[40px] cursor-pointer shrink-0"
      >
        <div ref={layerRef} className="absolute top-0 left-0 w-full h-full z-10" />
      </div>
    </div>
  );
}
