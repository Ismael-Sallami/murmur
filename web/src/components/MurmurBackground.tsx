import React from "react";

interface MurmurBackgroundProps {
  /** Si el estado actual ha alcanzado la síntesis y orden (armonía esmeralda) */
  isOrdered: boolean;
  /** Posición de desplazamiento vertical (scrollY) para el cálculo de parallax */
  scrollY?: number;
}

/**
 * Componente `MurmurBackground`:
 * Renderiza el lienzo atmosférico de la Aurora Nórdica con soporte de Parallax por Scroll.
 * 
 * A medida que el usuario desciende por la interfaz, las masas de luz boreal
 * se mueven a diferentes velocidades vectoriales (técnica de capas multi-profundidad),
 * generando una sensación de tridimensionalidad viva.
 * 
 * La paleta evoluciona del estado 'Murmullo' (cian cuántico #00F0FF y ráfagas difusas)
 * al estado 'Orden' (esmeralda relajante #10B981 y estabilidad focal).
 */
export const MurmurBackground: React.FC<MurmurBackgroundProps> = ({ isOrdered, scrollY = 0 }) => {
  // Factores de traslación parallax calculados suavemente
  const aurora1Y = scrollY * 0.22;
  const aurora1X = Math.sin(scrollY * 0.002) * 40;
  
  const aurora2Y = -scrollY * 0.15;
  const aurora2Scale = Math.min(1.3, 1 + scrollY * 0.0004);

  const aurora3Y = scrollY * 0.35;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0A0F1D] select-none">
      {/* Luz difusa Aurora 1 (Cyan Eléctrico Boreal - Capa Frontal) */}
      <div
        className={`absolute -top-32 left-1/4 w-[650px] h-[650px] rounded-full blur-[140px] transition-colors duration-1000 will-change-transform ${
          isOrdered
            ? "bg-[#10B981]/15 opacity-80"
            : "bg-[#00F0FF]/16 opacity-90 animate-aurora-slow"
        }`}
        style={{
          transform: `translate3d(${aurora1X}px, ${aurora1Y}px, 0)`,
        }}
      />

      {/* Luz difusa Aurora 2 (Esmeralda Profunda - Capa Intermedia Parallax Inversa) */}
      <div
        className={`absolute top-1/3 -right-24 w-[550px] h-[550px] rounded-full blur-[130px] transition-colors duration-1000 will-change-transform ${
          isOrdered
            ? "bg-[#10B981]/25 opacity-90"
            : "bg-[#059669]/15 opacity-70 animate-aurora-reverse"
        }`}
        style={{
          transform: `translate3d(0, ${aurora2Y}px, 0) scale(${aurora2Scale})`,
        }}
      />

      {/* Luz difusa Aurora 3 (Iris Místico - Capa de Profundidad Inferior) */}
      <div
        className={`absolute -bottom-40 left-1/3 w-[750px] h-[450px] rounded-full blur-[160px] transition-colors duration-1000 will-change-transform ${
          isOrdered
            ? "bg-[#10B981]/12"
            : "bg-[#818CF8]/10"
        }`}
        style={{
          transform: `translate3d(0, ${-aurora3Y * 0.5}px, 0)`,
        }}
      />

      {/* Malla estructural cibernética sutil inspirada en el design system de Stitch */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(#00F0FF 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          transform: `translateY(${-(scrollY * 0.05) % 36}px)`,
        }}
      />

      {/* Haz de luz de horizonte o niebla cuántica suave */}
      <div
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#00F0FF]/[0.03] to-transparent pointer-events-none"
      />
    </div>
  );
};
