import React from "react";
import { Activity, Cpu, Sparkles, FolderSync, ArrowRight, CheckCircle2 } from "lucide-react";
import { InteractiveCard } from "./InteractiveCard";

interface PipelineShowcaseProps {
  scrollY: number;
}

/**
 * Componente `PipelineShowcase`:
 * Presenta el flujo vivo 'Del Murmullo al Orden' con animaciones continuas
 * y desplazamiento parallax según la posición del usuario en la página.
 * 
 * Cada una de las 4 etapas del pipeline reacciona de forma diferenciada:
 * - Etapa 1: Ingesta acústica a 16kHz
 * - Etapa 2: Diarización y transcripción Whisper
 * - Etapa 3: Estructuración cognitiva Cornell + LaTeX
 * - Etapa 4: Bóveda de ficheros y sincronización MCP
 */
export const PipelineShowcase: React.FC<PipelineShowcaseProps> = ({ scrollY }) => {
  // Cálculo de traslación suave para efecto parallax horizontal/vertical
  const parallaxOffsetA = Math.sin(scrollY * 0.003) * 6;
  const parallaxOffsetB = Math.cos(scrollY * 0.003) * 6;

  const stages = [
    {
      id: "stage-audio",
      stepNumber: "01",
      title: "Captura & Murmullo",
      badge: "16kHz Mono • Opus",
      color: "cyan",
      borderColor: "border-[#00F0FF]/30",
      accentBg: "bg-[#00F0FF]/10",
      icon: Activity,
      description:
        "Normalización acústica continua. Filtra el ruido ambiente y modula el sonido en paquetes de audio equilibrados.",
      mockVisual: (
        <div className="flex items-center justify-center gap-1.5 h-12 bg-slate-950/60 rounded-xl px-3 border border-[#00F0FF]/20">
          {[40, 75, 55, 90, 60, 100, 45, 80, 65, 95, 50, 70].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-[#00F0FF] rounded-full transition-all duration-300"
              style={{
                height: `${h}%`,
                opacity: 0.4 + (i % 3) * 0.3,
                animation: `float ${2 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      ),
    },
    {
      id: "stage-whisper",
      stepNumber: "02",
      title: "Whisper & Diarización",
      badge: "OpenAI Whisper",
      color: "emerald",
      borderColor: "border-[#10B981]/30",
      accentBg: "bg-[#10B981]/10",
      icon: Cpu,
      description:
        "El dictado se transforma en palabras exactas con puntuación natural, detección de términos técnicos y cero retraso.",
      mockVisual: (
        <div className="bg-slate-950/60 rounded-xl p-2.5 font-mono text-[11px] text-slate-300 border border-[#10B981]/20 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[10px]">
            <span>[00:14.2] STREAM</span>
            <span className="text-[#10B981]">Confianza: 99.4%</span>
          </div>
          <p className="text-slate-200">
            "La entropía de un sistema aislado nunca decrece..."
          </p>
        </div>
      ),
    },
    {
      id: "stage-cornell",
      stepNumber: "03",
      title: "Síntesis Cornell & LaTeX",
      badge: "Estructuración LLM",
      color: "iris",
      borderColor: "border-[#818CF8]/30",
      accentBg: "bg-[#818CF8]/10",
      icon: Sparkles,
      description:
        "Generación automática de formato Cornell con preguntas mnemotécnicas, fórmulas matemáticas en LaTeX y preguntas clave.",
      mockVisual: (
        <div className="bg-slate-950/60 rounded-xl p-2.5 font-mono text-[11px] border border-[#818CF8]/20 space-y-1">
          <div className="text-[10px] text-[#818CF8] uppercase tracking-wider font-semibold">
            Columna de Repaso:
          </div>
          <div className="text-slate-300 flex items-center justify-between">
            <span>¿Segunda Ley?</span>
            <span className="text-emerald-400">dS ≥ 0</span>
          </div>
        </div>
      ),
    },
    {
      id: "stage-storage",
      stepNumber: "04",
      title: "Bóveda & MCP Sync",
      badge: "Markdown • Obsidian • PDF",
      color: "cyan",
      borderColor: "border-sky-400/30",
      accentBg: "bg-sky-400/10",
      icon: FolderSync,
      description:
        "Organización automática en disco: data/clases/<Materia>/ y sincronización directa con Obsidian, Notion y compilación LaTeX.",
      mockVisual: (
        <div className="bg-slate-950/60 rounded-xl p-2.5 font-mono text-[10px] border border-sky-400/20 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tema_01_Termodinamica.md</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 pl-4">
            <span>↳ Tema_01_Termodinamica.tex (Compilado PDF)</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="seccion-pipeline" className="space-y-6 pt-4">
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
              Pipeline Autónomo
            </span>
            <span className="text-xs text-slate-400 font-mono">Del Murmullo al Orden</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            Arquitectura de Procesamiento en Tiempo Real
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Cada fragmento de audio capturado en el aula viaja a través de un ciclo continuo de
            normalización, transcripción, síntesis de apuntes y almacenamiento ordenado en disco.
          </p>
        </div>
      </div>

      {/* Grid interactivo de las 4 etapas con efecto Parallax */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          // Alternar direcciones de parallax para dar dinamismo al scroll
          const dynamicParallax = idx % 2 === 0 ? parallaxOffsetA : parallaxOffsetB;

          return (
            <InteractiveCard
              key={stage.id}
              glowColor={stage.color as any}
              className="glass-panel p-5 flex flex-col justify-between space-y-4 hover:border-[#00F0FF]/40"
            >
              <div
                style={{
                  transform: `translateY(${dynamicParallax}px)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl ${stage.accentBg} ${stage.borderColor} border flex items-center justify-center`}
                  >
                    <Icon className="w-4 h-4 text-slate-100" />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {stage.stepNumber}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    {stage.title}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 inline-block mt-1">
                    {stage.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {stage.description}
                </p>
              </div>

              <div className="pt-2">{stage.mockVisual}</div>
            </InteractiveCard>
          );
        })}
      </div>
    </section>
  );
};
