import React, { useEffect, useRef } from "react";

interface MurmurBackgroundProps {
  isOrdered: boolean;
}

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  text: string;
  opacity: number;
}

const WHISPER_WORDS = [
  "murmullo", "teorema", "entropía", "voz", "ecuación", "derivada",
  "concepto", "idea", "análisis", "fórmula", "orden", "resonancia",
  "axioma", "síntesis", "onda", "lógica", "conocimiento"
];

export const MurmurBackground: React.FC<MurmurBackgroundProps> = ({ isOrdered }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Crear partículas
    const particleCount = 38;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      // Posición ordenada en matriz de líneas de cuadrícula
      const col = i % 8;
      const row = Math.floor(i / 8);
      const targetGridX = (width * 0.15) + col * (width * 0.1);
      const targetGridY = (height * 0.2) + row * (height * 0.14);

      particles.push({
        x: rx,
        y: ry,
        originX: rx,
        originY: ry,
        targetX: targetGridX,
        targetY: targetGridY,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        size: Math.random() * 2 + 1.5,
        text: WHISPER_WORDS[i % WHISPER_WORDS.length],
        opacity: Math.random() * 0.15 + 0.05,
      });
    }

    const render = () => {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        if (!isOrdered) {
          // Fase 1: El Murmullo (Movimiento libre y caótico pero lento y calmo)
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        } else {
          // Fase 2: El Orden (Atracción magnética hacia la armonía geométrica)
          p.x += (p.targetX - p.x) * 0.035;
          p.y += (p.targetY - p.y) * 0.035;
        }

        // Dibujar el texto flotante difuso del murmullo
        ctx.font = `${p.size * 3.5}px monospace`;
        ctx.fillStyle = `rgba(148, 163, 184, ${p.opacity})`;
        ctx.fillText(p.text, p.x, p.y);

        // Dibujar nodo central de la partícula
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isOrdered ? "rgba(56, 189, 248, 0.25)" : "rgba(100, 116, 139, 0.15)";
        ctx.fill();
      });

      // Si está en orden, dibujar tenues líneas de conexión entre nodos ordenados
      if (isOrdered) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.04)";
        ctx.lineWidth = 1;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 140) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOrdered]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
};
