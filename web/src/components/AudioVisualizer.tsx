import React, { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  stream: MediaStream | null;
}

/**
 * Componente `AudioVisualizer`:
 * Renderiza el espectro de frecuencias de la voz con estética 'Nordic Aurora'
 * y retroalimentación analítica en tiempo real:
 * - 42 bandas de frecuencia con gradiente de tres tonos (#00F0FF -> #10B981 -> #818CF8).
 * - Efecto de resplandor reactivo (glow) dinámico que aumenta con la intensidad vocal.
 * - Modo reposo orgánico que simula la brisa ártica mediante oscilaciones armónicas.
 * - Telemetría de señal (dB promedio y frecuencia muestral).
 */
export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, stream }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [signalDb, setSignalDb] = useState<number>(-60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    if (isRecording && stream) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.85;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch (err) {
        console.warn("No fue posible inicializar el analizador de audio WebAudio:", err);
      }
    }

    let frameCount = 0;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const midY = canvas.height / 2;
      const totalBars = 42;
      const barWidth = Math.floor(canvas.width / totalBars) - 2;

      if (isRecording && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as any);

        // Cálculo de energía RMS / dB para telemetría
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        frameCount++;
        if (frameCount % 6 === 0) {
          const estimatedDb = avg > 0 ? Math.round(20 * Math.log10(avg / 255)) : -60;
          setSignalDb(estimatedDb);
        }

        for (let i = 0; i < totalBars; i++) {
          const sampleIndex = Math.floor((i / totalBars) * (dataArray.length * 0.75));
          const val = dataArray[sampleIndex] || 0;
          const barHeight = Math.max(4, (val / 255) * (canvas.height * 0.88));

          const x = i * (barWidth + 2) + 3;
          const y = midY - barHeight / 2;

          // Gradiente cromático nórdico
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, "#00F0FF"); // Cyan Boreal
          grad.addColorStop(0.5, "#10B981"); // Esmeralda
          grad.addColorStop(1, "#818CF8"); // Iris profundo

          ctx.shadowBlur = val > 90 ? 14 : 3;
          ctx.shadowColor = "#00F0FF";
          ctx.fillStyle = grad;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2.5);
          ctx.fill();
        }
      } else {
        // Modo reposo: respiración armónica
        ctx.shadowBlur = 0;
        const time = Date.now() / 700;

        for (let i = 0; i < totalBars; i++) {
          const wave = Math.sin(time + i * 0.22);
          const barHeight = Math.max(3, (wave * 0.5 + 0.5) * 8 + 3);
          const x = i * (barWidth + 2) + 3;
          const y = midY - barHeight / 2;

          ctx.fillStyle = "rgba(0, 240, 255, 0.18)";
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isRecording, stream]);

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-2">
      <div className="relative w-full max-w-lg">
        <canvas
          ref={canvasRef}
          width={520}
          height={70}
          className="w-full h-16 bg-[#0A0F1D]/80 rounded-2xl border border-sky-500/20 px-2 backdrop-blur-md shadow-inner shadow-black/40"
        />

        {/* Telemetría sobreimpresionada */}
        <div className="absolute top-1.5 right-3 flex items-center gap-2 pointer-events-none text-[9px] font-mono text-slate-400">
          <span>{isRecording ? `${signalDb} dBFS` : "STANDBY"}</span>
          <span className="w-1 h-1 rounded-full bg-[#00F0FF]" />
          <span>48 kHz</span>
        </div>
      </div>
    </div>
  );
};
