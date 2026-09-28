import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Upload,
  FileText,
  BookOpen,
  Copy,
  Check,
  Layers,
  FileCode,
  Database,
  Volume2,
  VolumeX,
} from "lucide-react";
import { marked } from "marked";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { SecurityNotice } from "./components/SecurityNotice";
import { StructuredFilesExplorer } from "./components/StructuredFilesExplorer";
import { PipelineShowcase } from "./components/PipelineShowcase";
import { Hero } from "./components/Hero";
import { soundScape } from "./audio/soundScape";
import { useLiveSpeech } from "./hooks/useLiveSpeech";

export const App: React.FC = () => {

  // Parámetros de la sesión
  const [subject, setSubject] = useState("Física Teórica");
  const [title, setTitle] = useState("Tema 1: Principios de la Termodinámica");

  // Estado de navegación
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");
  const [notesViewMode, setNotesViewMode] = useState<"preview" | "raw">("preview");

  // Estado sonoro y ambiental (Del Murmullo al Orden)
  const [ambientAudioActive, setAmbientAudioActive] = useState(false);
  const [isOrderedState, setIsOrderedState] = useState(false);
  const [refreshFilesTrigger, setRefreshFilesTrigger] = useState(0);

  // Estado de grabación
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>("");
  const pendingChunkPromisesRef = useRef<Promise<any>[]>([]);

  // Hook de transcripción en directo en tiempo real (al momento)
  const {
    liveTranscript,
    interimText,
    startListening,
    stopListening,
    resetTranscript,
    setLiveTranscript,
  } = useLiveSpeech({ lang: "es-ES" });

  // Resultados
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [lastAudioPath, setLastAudioPath] = useState<string | null>(null);

  // Estados de carga y alertas
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Alternar sonido ambiental
  const toggleAmbientAudio = () => {
    if (ambientAudioActive) {
      soundScape.stopMurmur();
      setAmbientAudioActive(false);
      showToast("Murmullo ambiental silenciado.", "info");
    } else {
      soundScape.startMurmur(0.08);
      setAmbientAudioActive(true);
      showToast("Paisaje sonoro de calma activado.", "success");
    }
  };

  // Formato del cronómetro
  const formatTime = (totalSeconds: number) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  // Iniciar grabación y dictado en directo
  const handleStartRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("Micrófono no accesible. Asegúrate de usar http://localhost:8000 o HTTPS.", "error");
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      setIsRecording(true);
      setRecordSeconds(0);
      setChunkCount(0);
      setIsOrderedState(false);
      resetTranscript();
      pendingChunkPromisesRef.current = [];

      // 1. Iniciar dictado en vivo inmediato (Web Speech API)
      startListening();

      // 2. Iniciar grabación de audio en alta fidelidad (Opus chunks)
      const sessionId = "class_" + Date.now();
      sessionIdRef.current = sessionId;

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : {};

      const recorder = new MediaRecorder(audioStream, options);
      mediaRecorderRef.current = recorder;

      let currentChunkIdx = 0;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const chunkIdx = currentChunkIdx++;
          setChunkCount(chunkIdx + 1);

          const formData = new FormData();
          formData.append("session_id", sessionId);
          formData.append("chunk_index", String(chunkIdx));
          formData.append("chunk", event.data, `chunk_${chunkIdx}.webm`);

          const uploadPromise = fetch("/api/audio/chunk", { method: "POST", body: formData }).catch((e) =>
            console.error("Error al enviar chunk:", e)
          );
          pendingChunkPromisesRef.current.push(uploadPromise);
        }
      };

      // Emitir fragmentos cada 5 segundos para que incluso grabaciones cortas se sincronicen
      recorder.start(5000);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);

      showToast("Dictado en vivo activado. Habla para ver el texto al momento.", "info");
    } catch (err: any) {
      showToast("Error al abrir micrófono: " + err.message, "error");
    }
  };

  // Detener grabación y procesar automáticamente
  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);

    // Detener reconocimiento en vivo
    const capturedText = stopListening();

    // Detener MediaRecorder y esperar a que emita el último chunk
    const recorder = mediaRecorderRef.current;
    const stopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.stop();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsRecording(false);

    setIsLoading(true);
    setLoadingMessage("Ensamblando audio y estructurando apuntes...");

    try {
      await stopPromise;
      // Esperar a que todos los fragmentos en vuelo terminen de subir
      await Promise.all(pendingChunkPromisesRef.current);

      const formData = new FormData();
      formData.append("session_id", sessionIdRef.current);

      const res = await fetch("/api/audio/finalize", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al ensamblar audio");

      setLastAudioPath(data.merged_path);

      // Si el reconocimiento en vivo ya capturó texto, usarlo y disparar generación
      const currentFullText = liveTranscript || capturedText;
      if (currentFullText && currentFullText.trim().length > 10) {
        await processAndStructureLecture(currentFullText, data.merged_path);
      } else {
        // Si no hubo texto en vivo (navegador sin Web Speech), transcribir con Whisper
        await triggerWhisperAndStructure(data.merged_path);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Transcribir con Whisper y estructurar
  const triggerWhisperAndStructure = async (audioPath: string) => {
    setIsLoading(true);
    setLoadingMessage("Transcribiendo clase con Whisper...");
    try {
      const res = await fetch("/api/audio/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_path: audioPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Fallo en Whisper");

      setLiveTranscript(data.text);
      await processAndStructureLecture(data.text, audioPath);
    } catch (err: any) {
      showToast("Error en Whisper: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Generar apuntes con LLM y organizar ficheros en disco
  const processAndStructureLecture = async (transcriptText: string, audioPath?: string | null) => {
    if (!transcriptText.trim()) return;

    setIsLoading(true);
    setLoadingMessage("Sintetizando apuntes en formato Cornell y generando ficheros...");

    try {
      // 1. Sintetizar apuntes con LLM
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          subject: subject.trim() || "General",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al generar apuntes");

      const generatedNotes = data.notes;
      setNotesMarkdown(generatedNotes);

      // 2. Resolución acústica del Murmullo al Orden
      setIsOrderedState(true);
      soundScape.transitionToOrder();

      // 3. Auto-estructurar ficheros en disco por asignatura (.md, .tex, .pdf, .json, .txt)
      const autoRes = await fetch("/api/files/auto-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || "General",
          title: title.trim() || "Tema_Clase",
          transcript: transcriptText,
          notes_md: generatedNotes,
          audio_path: audioPath,
        }),
      });

      if (autoRes.ok) {
        setRefreshFilesTrigger((prev) => prev + 1);
        showToast("✨ Ficheros estructurados guardados automáticamente.", "success");
      }
    } catch (err: any) {
      showToast("Error en procesamiento: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Subida de archivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage(`Subiendo ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/audio/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error en la subida");

      setLastAudioPath(data.path);
      showToast(`Archivo subido. Transcribiendo con Whisper...`, "success");
      await triggerWhisperAndStructure(data.path);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Exportaciones MCP manuales
  const handleExport = async (target: "obsidian" | "latex" | "notion") => {
    if (!notesMarkdown) {
      showToast("No hay apuntes generados para exportar.", "error");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(`Sincronizando con ${target.toUpperCase()} vía MCP...`);

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target,
          title: title.trim() || "Apuntes_Clase",
          content: notesMarkdown,
          subject: subject.trim() || "General",
          compile_pdf: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Fallo al exportar");

      if (target === "obsidian") {
        showToast(`Nota sincronizada con Obsidian: ${data.file_path}`, "success");
      } else if (target === "latex") {
        showToast(
          data.pdf_path
            ? `PDF compilado exitosamente: ${data.pdf_path}`
            : `Código LaTeX (.tex) generado: ${data.tex_path}`,
          "success"
        );
      } else if (target === "notion") {
        showToast("Página creada en Notion correctamente.", "success");
      }
    } catch (err: any) {
      showToast("Error al exportar: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(liveTranscript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const totalWords = (liveTranscript ? liveTranscript.trim().split(/\s+/).length : 0);

  const scrollToConsole = () => {
    document.getElementById("seccion-consola")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportTargets = [
    { key: "obsidian" as const, label: "Obsidian", icon: Layers },
    { key: "latex" as const, label: "LaTeX / PDF", icon: FileCode },
    { key: "notion" as const, label: "Notion", icon: Database },
  ];

  return (
    <div className="min-h-screen bg-night text-chalk flex flex-col font-sans">
      {/* Notificación Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-lg text-sm flex items-start gap-2.5 border ${
            toast.type === "success"
              ? "bg-night-deep text-mint border-mint/30"
              : toast.type === "error"
              ? "bg-night-deep text-rose-300 border-rose-400/30"
              : "bg-night-deep text-chalk-soft border-white/10"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Barra superior */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-5 sm:px-6 h-16">
          <a href="#" className="font-display font-semibold text-xl text-chalk">
            murmur
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm text-chalk-muted">
            <a href="#seccion-consola" className="hover:text-chalk transition-colors">Grabar</a>
            <a href="#seccion-apuntes" className="hover:text-chalk transition-colors">Apuntes</a>
            <a href="#seccion-pipeline" className="hover:text-chalk transition-colors">Cómo funciona</a>
            <a href="#seccion-ficheros" className="hover:text-chalk transition-colors">Archivos</a>
          </nav>

          <button
            onClick={toggleAmbientAudio}
            className={`flex items-center gap-2 text-sm transition-colors ${
              ambientAudioActive ? "text-mint" : "text-chalk-muted hover:text-chalk"
            }`}
            title="Sonido de fondo para concentrarte"
          >
            {ambientAudioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Ruido de fondo</span>
          </button>
        </div>
      </header>

      <Hero onStart={scrollToConsole} />

      <main className="max-w-5xl mx-auto w-full px-5 sm:px-6 pb-24 flex-1 space-y-24">
        <SecurityNotice />

        {/* Grabación */}
        <section id="seccion-consola" className="scroll-mt-8">
          <h2 className="section-title">Grabar</h2>
          <p className="mt-2 text-chalk-muted">Pon el nombre de la asignatura y el tema para que se guarde en su carpeta.</p>

          <div className="night-card mt-8 p-5 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="field-label">Asignatura</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Física Teórica"
                  className="field"
                />
              </label>
              <label className="block">
                <span className="field-label">Tema</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tema 1: Termodinámica"
                  className="field"
                />
              </label>
            </div>

            <div className="mt-8 flex gap-6 border-b border-white/[0.08] text-sm">
              {(["record", "upload"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`-mb-px pb-3 border-b-2 transition-colors ${
                    activeTab === tab ? "border-mint text-chalk" : "border-transparent text-chalk-muted hover:text-chalk"
                  }`}
                >
                  {tab === "record" ? "En directo" : "Subir audio"}
                </button>
              ))}
            </div>

            {activeTab === "record" ? (
              <div className="pt-8 flex flex-col items-center gap-6">
                <div className="text-center">
                  <div
                    className={`font-mono text-5xl sm:text-6xl tabular-nums transition-colors ${
                      isRecording ? "text-chalk" : "text-chalk-faint"
                    }`}
                  >
                    {formatTime(recordSeconds)}
                  </div>
                  <p className="mt-2 text-sm text-chalk-muted flex items-center justify-center gap-2">
                    {isRecording && <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />}
                    {isRecording
                      ? `Grabando${chunkCount > 0 ? ` · ${chunkCount} trozos subidos` : ""}`
                      : "Sin grabar"}
                  </p>
                </div>

                <AudioVisualizer isRecording={isRecording} stream={stream} />

                {!isRecording ? (
                  <button onClick={handleStartRecording} disabled={isLoading} className="btn-primary">
                    <Mic className="w-4 h-4" />
                    Empezar a grabar
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-chalk text-night font-semibold transition-colors hover:bg-chalk-soft"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Parar y hacer los apuntes
                  </button>
                )}
              </div>
            ) : (
              <div className="pt-8">
                <div className="py-10 border border-dashed border-white/15 rounded-lg text-center">
                  <Upload className="w-6 h-6 text-chalk-muted mx-auto" />
                  <p className="mt-3 text-chalk">Sube la grabación de una clase</p>
                  <p className="text-sm text-chalk-muted mt-1">MP3, M4A, WAV, WebM u OGG</p>
                  <input type="file" id="upload-input" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => document.getElementById("upload-input")?.click()} className="btn-ghost mt-5">
                    Elegir archivo
                  </button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="mt-6 flex items-center justify-center gap-3 text-sm text-chalk-soft">
                <div className="w-4 h-4 border-2 border-mint border-t-transparent rounded-full animate-spin" />
                <span>{loadingMessage}</span>
              </div>
            )}
          </div>
        </section>

        {/* Transcripción y apuntes */}
        <section id="seccion-apuntes" className="scroll-mt-8">
          <h2 className="section-title">Apuntes</h2>
          <p className="mt-2 text-chalk-muted">A la izquierda lo que se ha dicho; a la derecha, ya ordenado.</p>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Transcripción en directo */}
            <div className="night-card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-chalk-muted" />
                  <h3 className="font-medium">Transcripción</h3>
                  {isRecording && <span className="text-xs text-rose-300">en directo</span>}
                </div>
                <div className="flex items-center gap-4 text-sm text-chalk-muted">
                  <span>{totalWords} palabras</span>
                  <button
                    onClick={handleCopyTranscript}
                    disabled={!liveTranscript}
                    className="flex items-center gap-1 hover:text-chalk transition-colors disabled:opacity-40"
                  >
                    {copiedTranscript ? <Check className="w-3.5 h-3.5 text-mint" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedTranscript ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[280px] max-h-[400px] overflow-y-auto rounded-lg bg-night p-4 text-[15px] leading-relaxed text-chalk-soft">
                {liveTranscript || interimText ? (
                  <p>
                    <span>{liveTranscript}</span>
                    {interimText && <span className="text-chalk-faint ml-1">{interimText}</span>}
                    {isRecording && <span className="inline-block w-[2px] h-4 bg-chalk ml-1 animate-pulse align-middle" />}
                  </p>
                ) : (
                  <p className="text-chalk-faint">Aquí irá apareciendo el texto mientras grabas.</p>
                )}
              </div>

              <button
                onClick={() => processAndStructureLecture(liveTranscript, lastAudioPath)}
                disabled={isLoading || !liveTranscript.trim()}
                className="btn-ghost w-full py-2.5"
              >
                <BookOpen className="w-4 h-4" />
                Hacer apuntes con este texto
              </button>
            </div>

            {/* Apuntes estructurados */}
            <div className="night-card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-chalk-muted" />
                  <h3 className="font-medium">Apuntes</h3>
                </div>
                <div className="flex gap-3 text-sm">
                  {(["preview", "raw"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setNotesViewMode(mode)}
                      className={`transition-colors ${
                        notesViewMode === mode ? "text-chalk underline underline-offset-4 decoration-mint" : "text-chalk-muted hover:text-chalk"
                      }`}
                    >
                      {mode === "preview" ? "Leer" : "Markdown"}
                    </button>
                  ))}
                </div>
              </div>

              {notesViewMode === "preview" ? (
                <div
                  className="notes-prose flex-1 min-h-[280px] max-h-[400px] overflow-y-auto rounded-lg bg-night p-4"
                  dangerouslySetInnerHTML={{
                    __html: notesMarkdown
                      ? (marked.parse(notesMarkdown) as string)
                      : "<p class='text-chalk-faint'>Cuando termines de grabar, los apuntes aparecerán aquí.</p>",
                  }}
                />
              ) : (
                <textarea
                  value={notesMarkdown}
                  onChange={(e) => setNotesMarkdown(e.target.value)}
                  placeholder="Markdown de los apuntes…"
                  className="flex-1 min-h-[280px] max-h-[400px] rounded-lg bg-night border border-transparent p-4 text-sm font-mono text-chalk-soft resize-none focus:outline-none focus:border-white/15"
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-chalk-muted mr-1">Enviar a</span>
                {exportTargets.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleExport(key)}
                    disabled={isLoading || !notesMarkdown}
                    className="btn-ghost"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <PipelineShowcase />

        <StructuredFilesExplorer refreshTrigger={refreshFilesTrigger} />
      </main>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-chalk-faint">
          <span>murmur · código abierto, licencia MIT</span>
          <span>Hecho para estudiar un poco más tranquilo.</span>
        </div>
      </footer>
    </div>
  );
};
