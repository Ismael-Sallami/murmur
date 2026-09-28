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

    let animationFrameId: number;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    if (isRecording && stream) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch (err) {
        console.warn("No se pudo iniciar el visualizador de audio:", err);
      }
    }

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isRecording && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as any);

        const barWidth = (canvas.width / dataArray.length) * 2;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.85 + 4;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, "#2563eb");
          gradient.addColorStop(0.5, "#38bdf8");
          gradient.addColorStop(1, "#f43f5e");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 3, barHeight, 4);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Onda suave en reposo
        ctx.fillStyle = "#334155";
        const bars = 24;
        const barWidth = canvas.width / bars;
        for (let i = 0; i < bars; i++) {
          const height = Math.sin(Date.now() / 400 + i * 0.4) * 4 + 6;
          ctx.beginPath();
          ctx.roundRect(i * barWidth + 3, (canvas.height - height) / 2, barWidth - 6, height, 2);
          ctx.fill();
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isRecording, stream]);

  return (
    <div className="w-full flex items-center justify-center py-2">
      <canvas
        ref={canvasRef}
        width={360}
        height={56}
        className="w-full max-w-sm h-14 bg-slate-900/60 rounded-xl border border-slate-800/80 px-2"
      />
    </div>
  );
};
