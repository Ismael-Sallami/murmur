import React from "react";
import { Mic } from "lucide-react";

interface HeroProps {
  onStart: () => void;
}

/** Estilo para que las transformaciones CSS de elementos SVG giren sobre su propio centro */
const svgOrigin: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

const OUTLINE = "#0F1220";

const NOTES = [
  { char: "♪", x: "12%", y: "56%", dx: "-40px", rot: "-18deg", color: "text-mint", delay: "0s" },
  { char: "♫", x: "18%", y: "64%", dx: "-10px", rot: "14deg", color: "text-peach", delay: "2.2s" },
  { char: "♩", x: "84%", y: "56%", dx: "40px", rot: "18deg", color: "text-lilac", delay: "1.1s" },
  { char: "♪", x: "78%", y: "66%", dx: "15px", rot: "-12deg", color: "text-mist", delay: "3.4s" },
];

const EQ = [
  { dx: -12, h: 20, delay: "0s" },
  { dx: -4, h: 30, delay: "0.2s" },
  { dx: 4, h: 24, delay: "0.4s" },
  { dx: 12, h: 16, delay: "0.6s" },
];

/** Una copa de los cascos, en ilustración plana: carcasa, almohadilla y ecualizador */
const EarCup: React.FC<{ cx: number; side: "left" | "right" }> = ({ cx, side }) => {
  const cy = 290;
  const cushionX = side === "left" ? cx + 30 : cx - 56;
  return (
    <g>
      <rect x={cushionX} y={cy - 46} width={26} height={92} rx={13} fill="#2A2F48" stroke={OUTLINE} strokeWidth={4} />
      <rect x={cx - 46} y={cy - 58} width={92} height={116} rx={40} fill="#B9A7F2" stroke={OUTLINE} strokeWidth={4} />
      <circle cx={cx} cy={cy} r={28} fill={OUTLINE} />
      {EQ.map((bar, i) => (
        <rect
          key={i}
          x={cx + bar.dx - 2.5}
          y={cy - bar.h / 2}
          width={5}
          height={bar.h}
          rx={2.5}
          fill="#A8E6CF"
          className="animate-wave"
          style={{ ...svgOrigin, animationDelay: bar.delay }}
        />
      ))}
    </g>
  );
};

/**
 * Componente `Hero`:
 * Portada de Murmur con unos cascos en ilustración plana que se mecen despacio
 * mientras suenan notas, como en una sesión de estudio.
 */
export const Hero: React.FC<HeroProps> = ({ onStart }) => {
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-16 sm:pt-24 pb-16 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
      <div>
        <h1 className="font-display font-semibold text-[2.6rem] sm:text-6xl leading-[1.05] tracking-[-0.02em]">
          Atiende en clase.
          <br />
          <span className="text-mint">Los apuntes, luego.</span>
        </h1>

        <p className="mt-6 text-lg text-chalk-soft leading-relaxed max-w-md">
          Murmur graba la clase desde el móvil, la transcribe con Whisper y te deja unos apuntes en
          formato Cornell en tu carpeta de Obsidian, Notion o en un PDF.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button onClick={onStart} className="btn-primary">
            <Mic className="w-4 h-4" />
            Grabar una clase
          </button>
          <a href="#seccion-consola" className="text-chalk-muted hover:text-chalk underline underline-offset-4 decoration-white/20">
            o sube un audio que ya tengas
          </a>
        </div>
      </div>

      <div aria-hidden className="relative mx-auto w-full max-w-[400px] select-none pointer-events-none">
        <svg viewBox="0 0 420 380" className="w-full h-auto overflow-visible animate-bob">
          {/* Diadema */}
          <path d="M84 240 C 84 60, 336 60, 336 240" fill="none" stroke={OUTLINE} strokeWidth={30} strokeLinecap="round" />
          <path d="M84 240 C 84 60, 336 60, 336 240" fill="none" stroke="#8EB8E6" strokeWidth={22} strokeLinecap="round" />
          {/* Deslizadores */}
          <rect x={72} y={214} width={24} height={30} rx={6} fill="#2A2F48" stroke={OUTLINE} strokeWidth={4} />
          <rect x={324} y={214} width={24} height={30} rx={6} fill="#2A2F48" stroke={OUTLINE} strokeWidth={4} />

          <EarCup cx={84} side="left" />
          <EarCup cx={336} side="right" />
        </svg>

        {NOTES.map((n, i) => (
          <span
            key={i}
            className={`absolute text-3xl ${n.color} animate-note`}
            style={
              {
                left: n.x,
                top: n.y,
                animationDelay: n.delay,
                "--dx": n.dx,
                "--rot": n.rot,
              } as React.CSSProperties
            }
          >
            {n.char}
          </span>
        ))}

        <p className="mt-4 text-center font-mono text-xs text-chalk-faint">lo-fi para estudiar · 42:18</p>
      </div>
    </section>
  );
};
