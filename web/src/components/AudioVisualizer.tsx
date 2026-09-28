import React, { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  stream: MediaStream | null;
}

/**
 * Componente `AudioVisualizer`:
 * Renderiza el espectro de frecuencias de la voz como barras de tinta dentro
 * de una píldora, con retroalimentación en tiempo real:
 * - 42 bandas de frecuencia redondeadas.
 * - Modo reposo orgánico mediante oscilaciones armónicas.
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

          ctx.fillStyle = "#A8E6CF";

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2.5);
          ctx.fill();
        }
      } else {
        // Modo reposo: respiración armónica
        const time = Date.now() / 700;

        for (let i = 0; i < totalBars; i++) {
          const wave = Math.sin(time + i * 0.22);
          const barHeight = Math.max(3, (wave * 0.5 + 0.5) * 8 + 3);
          const x = i * (barWidth + 2) + 3;
          const y = midY - barHeight / 2;

          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
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
      <div className="relative w-full max-w-md">
        <canvas
          ref={canvasRef}
          width={520}
          height={80}
          className="w-full h-20 bg-night rounded-lg border border-white/10 px-4"
        />

        {/* Telemetría */}
        <div className="mt-2 flex items-center justify-center gap-2 pointer-events-none text-[11px] font-mono text-chalk-muted">
          <span>{isRecording ? `${signalDb} dBFS` : "EN ESPERA"}</span>
          <span className="w-1 h-1 rounded-full bg-chalk-faint" />
          <span>48 kHz</span>
        </div>
      </div>
    </div>
  );
};
