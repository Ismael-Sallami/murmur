import React from "react";

interface MurmurBackgroundProps {
  isOrdered: boolean;
}

export const MurmurBackground: React.FC<MurmurBackgroundProps> = ({ isOrdered }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-nordic-bg">
      {/* Luz difusa Aurora 1 (Teal norte) */}
      <div
        className={`absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] transition-all duration-1000 ${
          isOrdered
            ? "bg-nordic-emerald/10 opacity-70 translate-y-12"
            : "bg-nordic-aurora/12 opacity-90 animate-pulse"
        }`}
      />

      {/* Luz difusa Aurora 2 (Esmeralda boreal) */}
      <div
        className={`absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full blur-[130px] transition-all duration-1000 ${
          isOrdered
            ? "bg-nordic-emerald/15 opacity-80"
            : "bg-teal-600/10 opacity-60"
        }`}
      />

      {/* Luz difusa Aurora 3 (Profundidad inferior) */}
      <div
        className="absolute -bottom-32 left-1/3 w-[700px] h-[400px] rounded-full bg-emerald-950/20 blur-[150px]"
      />

      {/* Malla de cuadrícula de micro-puntos ultra-sutil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#2dd4bf 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
};
