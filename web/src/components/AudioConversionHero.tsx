import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Volume2, Cpu, Play, Pause, CheckCircle2 } from 'lucide-react';

const DEMO_SCENARIOS = [
  {
    subject: 'Física Cuántica',
    audioTitle: 'Clase 04: Colapso de la función de onda y ecuación de Schrödinger',
    speechText: "I'm not totally sure. I also told the team that when an observer interacts with the quantum system, the wave function collapses instantaneously into measurable eigenstates.",
    cornellPreview: '📌 Idea clave: Colapso cuántico instantáneo | 📐 Fórmula: iħ ∂Ψ/∂t = ĤΨ | ⚠️ Pregunta de examen: ¿Por qué la medición no es unitaria?'
  },
  {
    subject: 'Derecho Constitucional',
    audioTitle: 'Lección 12: Principio de proporcionalidad y derechos fundamentales',
    speechText: 'Como vimos en la jurisprudencia, el juicio de proporcionalidad exige tres subprincipios consecutivos: idoneidad, necesidad y proporcionalidad en sentido estricto.',
    cornellPreview: '📌 Test de proporcionalidad: 1. Idoneidad 2. Necesidad 3. Proporcionalidad estricta | ⚖️ Art. 24 CE'
  },
  {
    subject: 'Medicina y Farmacología',
    audioTitle: 'Seminario 08: Cascada de señalización de la insulina y GLUT-4',
    speechText: 'La unión de la insulina a su receptor tirosina quinasa induce la autofosforilación y el posterior reclutamiento de IRS-1, desencadenando la traslocación de vesículas GLUT-4.',
    cornellPreview: '📌 Diana: Receptor tirosina quinasa | 🔬 Translocación: GLUT-4 hacia membrana celular | ⚡ Regulación glucémica'
  }
];

interface AudioConversionHeroProps {
  onStartRecording?: () => void;
  onExploreFiles?: () => void;
}

export const AudioConversionHero: React.FC<AudioConversionHeroProps> = ({
  onStartRecording,
  onExploreFiles,
}) => {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [typedLength, setTypedLength] = useState(0);
  const activeScenario = DEMO_SCENARIOS[activeScenarioIdx];

  // Typing effect that simulates live Whisper ASR streaming
  useEffect(() => {
    setTypedLength(0);
    if (!isPlaying) return;

    const fullText = activeScenario.speechText;
    const interval = setInterval(() => {
      setTypedLength((prev) => {
        if (prev < fullText.length) {
          return prev + 1;
        } else {
          setTimeout(() => {
            setTypedLength(0);
          }, 3500);
          return prev;
        }
      });
    }, 38);

    return () => clearInterval(interval);
  }, [activeScenarioIdx, isPlaying]);

  const displayedText = activeScenario.speechText.slice(0, typedLength);

  return (
    <section className="relative pt-8 pb-16 text-center overflow-hidden">
      {/* Glow radial */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[400px] pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, rgba(239, 246, 255, 0.9) 0%, rgba(255, 255, 255, 0) 70%)',
        }}
      />

      <div className="max-w-5xl mx-auto px-4">
        {/* Mini Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-600 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Whisper ASR + Model Context Protocol (MCP)</span>
        </div>

        {/* Big Serif Headline */}
        <h1 
          className="text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-slate-900 mb-6 font-serif"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          No escribas, <em className="italic text-blue-600">solo escucha.</em>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8 font-sans">
          La IA de voz a texto que convierte cada clase universitaria en apuntes Cornell perfectamente estructurados y listos para estudiar.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex items-center justify-center gap-3.5 flex-wrap mb-4">
          <button 
            onClick={onStartRecording}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-blue-600 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition transform hover:-translate-y-0.5"
          >
            <Volume2 className="w-5 h-5" />
            <span>Grabar clase ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button 
            onClick={onExploreFiles}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-slate-800 font-semibold text-base border border-slate-300 hover:bg-slate-50 transition"
          >
            Explorar Apuntes Guardados
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-10">
          Compatible con Windows, Mac, iPad, iPhone y Android · Sincronización continua de audio cada 60s
        </p>

        {/* =========================================================================
            AUDIO-TO-TEXT CONVERSION RIBBON (WISPR FLOW STYLE)
           ========================================================================= */}
        <div className="relative max-w-4xl mx-auto">
          {/* Scenario Selector Pills */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {DEMO_SCENARIOS.map((sc, idx) => (
              <button
                key={sc.subject}
                onClick={() => setActiveScenarioIdx(idx)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeScenarioIdx === idx
                    ? 'border-2 border-blue-600 bg-blue-50 text-blue-600'
                    : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {sc.subject}
              </button>
            ))}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pausar' : 'Reanudar'}</span>
            </button>
          </div>

          {/* Conversion Card with Ribbon */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5 text-left">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-xs font-semibold text-slate-800">Motor Whisper (Groq 120x realtime)</span>
                <span className="text-xs text-slate-400 hidden sm:inline">· {activeScenario.audioTitle}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                <Cpu className="w-3 h-3" />
                <span>Buffer 60s OK</span>
              </span>
            </div>

            {/* The Dynamic Dark Ribbon & Audio Pill */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
                {/* Audio Waveform Pill */}
                <div className="inline-flex items-center gap-1 bg-white text-slate-900 px-3.5 py-2 rounded-full font-bold text-xs shrink-0 shadow-md">
                  {[10, 18, 14, 22, 12, 24, 16, 8, 20, 14, 18, 6].map((h, i) => (
                    <span
                      key={i}
                      className="inline-block w-[3px] bg-blue-600 rounded-sm transition-all"
                      style={{
                        height: isPlaying ? `${h}px` : '6px',
                        animation: isPlaying ? `pulseWave 0.8s ease-in-out infinite alternate ${i * 0.08}s` : 'none'
                      }}
                    />
                  ))}
                  <span className="ml-1 text-slate-900">:</span>
                </div>

                {/* Real-time Streaming Transcribed Text */}
                <div className="text-left text-base sm:text-lg font-medium text-slate-100 leading-snug flex-1 min-h-[46px] flex items-center">
                  <span>
                    "{displayedText}"
                    <span className="inline-block w-0.5 h-5 bg-blue-500 align-middle ml-1 animate-pulse" />
                  </span>
                </div>
              </div>

              {/* Instant Cornell Synthesis Card */}
              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <span className="bg-blue-50 border border-blue-200 text-blue-600 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shrink-0">
                  Síntesis Cornell
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {activeScenario.cornellPreview}
                </p>
              </div>
            </div>

            {/* Bottom Proof Icons */}
            <div className="flex items-center justify-between flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Fórmulas LaTeX detectadas automáticamente
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Eliminación de muletillas y silencios
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Sincronización MCP a Obsidian y Notion
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
