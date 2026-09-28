import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  stream: MediaStream | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, stream }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        analyser.smoothingTimeConstant = 0.8;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch (err) {
        console.warn("Fallo al iniciar visualizador de audio:", err);
      }
    }

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const midY = canvas.height / 2;

      if (isRecording && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as any);

        const totalBars = 36;
        const barWidth = Math.floor(canvas.width / totalBars) - 3;

        for (let i = 0; i < totalBars; i++) {
          const sampleIndex = Math.floor((i / totalBars) * (dataArray.length * 0.7));
          const val = dataArray[sampleIndex] || 0;
          const barHeight = Math.max(4, (val / 255) * (canvas.height * 0.85));

          const x = i * (barWidth + 3) + 4;
          const y = midY - barHeight / 2;

          // Gradiente Aurora Nórdica
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, "#2dd4bf");   // Teal Boreal
          grad.addColorStop(0.5, "#10b981"); // Esmeralda
          grad.addColorStop(1, "#34d399");   // Menta luminosa

          ctx.shadowBlur = val > 80 ? 12 : 4;
          ctx.shadowColor = "#2dd4bf";
          ctx.fillStyle = grad;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else {
        // Estado reposo: Onda sinusoide etérea muy suave
        ctx.shadowBlur = 0;
        const totalBars = 36;
        const barWidth = Math.floor(canvas.width / totalBars) - 3;
        const time = Date.now() / 600;

        for (let i = 0; i < totalBars; i++) {
          const wave = Math.sin(time + i * 0.25);
          const barHeight = Math.max(3, (wave * 0.5 + 0.5) * 8 + 3);
          const x = i * (barWidth + 3) + 4;
          const y = midY - barHeight / 2;

          ctx.fillStyle = "rgba(45, 212, 191, 0.2)";
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
    <div className="w-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={480}
        height={64}
        className="w-full max-w-md h-16 bg-nordic-surface/40 rounded-2xl border border-nordic-border/60 px-2 backdrop-blur-md"
      />
    </div>
  );
};
