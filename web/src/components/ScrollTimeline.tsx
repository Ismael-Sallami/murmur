import React from "react";
import { Mic, BookOpen, GitMerge, FolderTree, ArrowUp } from "lucide-react";
import { ScrollMetrics } from "../hooks/useScrollProgress";

interface ScrollTimelineProps {
  metrics: ScrollMetrics;
}

/**
 * Componente `ScrollTimeline`:
 * Proporciona una experiencia de navegación dinámica durante el desplazamiento:
 * 1. Indicador superior de progreso continuo (0% a 100%) con gradiente Nordic Aurora.
 * 2. HUD interactivo flotante que resalta dinámicamente la etapa actual de la clase:
 *    - Captura & Dictado
 *    - Transcripción & Apuntes Cornell
 *    - Arquitectura del Pipeline
 *    - Bóveda de Ficheros en Disco
 * 3. Botón flotante para regresar rápidamente al inicio con animación de resplandor.
 */
export const ScrollTimeline: React.FC<ScrollTimelineProps> = ({ metrics }) => {
  const { progress, activeSection, scrollY } = metrics;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const steps = [
    { id: "seccion-consola", key: "recorder", label: "01. Captura", icon: Mic },
    { id: "seccion-apuntes", key: "notes", label: "02. Cuaderno Cornell", icon: BookOpen },
    { id: "seccion-pipeline", key: "pipeline", label: "03. Pipeline Vivo", icon: GitMerge },
    { id: "seccion-ficheros", key: "files", label: "04. Bóveda en Disco", icon: FolderTree },
  ];

  return (
    <>
      {/* 1. Barra de progreso fija superior */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#00F0FF] via-[#10B981] to-[#818CF8] shadow-[0_0_12px_rgba(0,240,255,0.7)] transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 2. HUD Flotante Lateral/Inferior de Etapas (Aparece a partir de 120px de scroll) */}
      <nav
        aria-label="Etapas de la sesión"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-out ${
          scrollY > 120 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        <div className="glass-panel-elevated px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xl border border-[#00F0FF]/30">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeSection === step.key;

            return (
              <button
                key={step.id}
                onClick={() => scrollTo(step.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all duration-300 ${
                  isActive
                    ? "bg-[#00F0FF]/20 text-[#00F0FF] font-semibold border border-[#00F0FF]/50 shadow-[0_0_10px_rgba(0,240,255,0.3)] scale-105"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
                title={`Ir a ${step.label}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#00F0FF] animate-pulse" : ""}`} />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Botón flotante para subir */}
          <button
            onClick={scrollToTop}
            className="p-1 rounded-full text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition"
            title="Volver a la cabecera"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </>
  );
};
