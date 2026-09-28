import React from "react";

/**
 * Componente `PipelineShowcase`:
 * Explica en cuatro pasos qué pasa con el audio desde que se graba
 * hasta que los apuntes están en disco.
 */
export const PipelineShowcase: React.FC = () => {
  const steps = [
    {
      title: "Grabas",
      text: "Desde el móvil o el portátil. El audio se sube en trozos cada pocos segundos, así que si se te apaga el móvil no pierdes la clase.",
    },
    {
      title: "Se transcribe",
      text: "Whisper pasa el audio a texto, en la nube (Groq) o en tu propio ordenador si prefieres que nada salga de casa.",
    },
    {
      title: "Se ordena",
      text: "Un modelo de lenguaje quita las muletillas y lo organiza en formato Cornell: ideas clave, definiciones, fórmulas en LaTeX y posibles preguntas de examen.",
    },
    {
      title: "Se guarda",
      text: "Todo queda en data/clases/<asignatura>/ como .md, .tex, .pdf y .json, y si quieres lo mandas a Obsidian o Notion.",
    },
  ];

  return (
    <section id="seccion-pipeline" className="scroll-mt-24">
      <h2 className="section-title">Cómo funciona</h2>

      <ol className="mt-8 grid sm:grid-cols-2 gap-x-12 gap-y-8">
        {steps.map((step, idx) => (
          <li key={step.title} className="flex gap-4">
            <span className="font-mono text-sm text-chalk-faint pt-1">{idx + 1}.</span>
            <div>
              <h3 className="font-display font-semibold text-xl text-chalk">{step.title}</h3>
              <p className="mt-1.5 text-chalk-muted leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
