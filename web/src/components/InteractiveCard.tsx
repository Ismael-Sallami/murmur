import React, { useRef, useState } from "react";

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  glowColor?: "cyan" | "emerald" | "iris";
}

/**
 * Componente `InteractiveCard`:
 * Envoltorio inteligente con microinteracciones táctiles avanzadas:
 * 1. Detección de la posición del puntero (`mousemove`) para calcular un sutil ángulo de inclinación 3D (Tilt).
 * 2. Reflejo especular radial que persigue al cursor sobre la superficie de cristal (Glassmorphic Specular Glow).
 * 3. Transición ultra-fluida al salir el cursor (`transition-transform duration-500`).
 */
export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className = "",
  id,
  glowColor = "cyan",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Cálculo normalizado (-1 a 1)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const normX = (x - centerX) / centerX;
    const normY = (y - centerY) / centerY;

    // Ángulos máximos sutiles (3 grados para máxima elegancia)
    setRotateX(-normY * 2.5);
    setRotateY(normX * 2.5);

    // Posición porcentual para el reflejo de luz
    setGlowPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.15,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlowPos((prev) => ({ ...prev, opacity: 0 }));
  };

  const glowRgba =
    glowColor === "emerald"
      ? "rgba(16, 185, 129, 0.4)"
      : glowColor === "iris"
      ? "rgba(129, 140, 248, 0.4)"
      : "rgba(0, 240, 255, 0.4)";

  return (
    <div
      ref={cardRef}
      id={id}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: "preserve-3d",
      }}
      className={`relative rounded-3xl transition-transform duration-200 ease-out ${className}`}
    >
      {/* Reflejo especular que persigue al cursor */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300 z-10"
        style={{
          opacity: glowPos.opacity,
          background: `radial-gradient(circle 300px at ${glowPos.x}% ${glowPos.y}%, ${glowRgba}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
};
