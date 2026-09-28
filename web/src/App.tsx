import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  FileText,
  BookOpen,
  Copy,
  Check,
  Radio,
  Layers,
  FileCode,
  Database,
  Volume2,
  VolumeX,
  Compass,
  ArrowRight,
  FolderOpen,
} from "lucide-react";
import { marked } from "marked";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { SecurityNotice } from "./components/SecurityNotice";
import { MurmurBackground } from "./components/MurmurBackground";
import { StructuredFilesExplorer } from "./components/StructuredFilesExplorer";
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

  return (
    <div className="min-h-screen bg-nordic-bg text-nordic-pearl flex flex-col font-sans relative overflow-x-hidden selection:bg-nordic-aurora selection:text-nordic-bg">
      {/* Fondo Atmosférico Boreal */}
      <MurmurBackground isOrdered={isOrderedState} />

      {/* Notificación Toast Flotante */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 border backdrop-blur-md transition-all ${
            toast.type === "success"
              ? "bg-nordic-surface/95 text-nordic-emerald border-nordic-emerald/50 shadow-emerald-950/40"
              : toast.type === "error"
              ? "bg-rose-950/95 text-rose-300 border-rose-700 shadow-rose-950/40"
              : "bg-nordic-surface/95 text-nordic-aurora border-nordic-aurora/50 shadow-teal-950/40"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Barra Superior de Estudio */}
      <header className="bg-nordic-surface/70 backdrop-blur-xl border-b border-nordic-border/70 sticky top-0 z-40 px-5 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-nordic-aurora/20 via-nordic-emerald/20 to-teal-500/20 border border-nordic-aurora/40 flex items-center justify-center text-nordic-aurora shadow-lg shadow-teal-950/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-nordic-pearl font-mono">
                  MURMUR
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-nordic-aurora/10 text-nordic-aurora border border-nordic-aurora/30">
                  Estudio Nórdico
                </span>
              </div>
              <p className="text-[11px] text-nordic-muted">Del Murmullo al Orden • Transcripción & Apuntes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Control Sonoro: Murmullo Calmo */}
            <button
              onClick={toggleAmbientAudio}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition ${
                ambientAudioActive
                  ? "bg-nordic-aurora/20 text-nordic-aurora border-nordic-aurora/50 shadow-md shadow-teal-950/40"
                  : "bg-nordic-surfaceLight/50 text-nordic-muted border-nordic-border/70 hover:text-nordic-pearl"
              }`}
              title="Activar murmullo sutil de fondo para concentración"
            >
              {ambientAudioActive ? <Volume2 className="w-3.5 h-3.5 text-nordic-aurora animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Murmullo Zen</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-nordic-surfaceLight/80 text-nordic-emerald border border-nordic-emerald/30">
              <span className="w-1.5 h-1.5 rounded-full bg-nordic-emerald animate-ping"></span>
              En Línea
            </span>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-6xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6 relative z-10">
        <SecurityNotice />

        {/* Parámetros de la Clase (Estilo Barra Minimalista) */}
        <div className="bg-nordic-surface/70 border border-nordic-border/80 rounded-2xl p-4 backdrop-blur-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-nordic-muted mb-1">
                Asignatura / Materia
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Física Teórica, Análisis Matemático..."
                className="w-full bg-nordic-bg/80 border border-nordic-border/80 rounded-xl px-3.5 py-2 text-xs font-medium text-nordic-pearl focus:outline-none focus:border-nordic-aurora focus:ring-1 focus:ring-nordic-aurora transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-nordic-muted mb-1">
                Tema / Sesión
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Tema 1: Leyes de la Termodinámica..."
                className="w-full bg-nordic-bg/80 border border-nordic-border/80 rounded-xl px-3.5 py-2 text-xs font-medium text-nordic-pearl focus:outline-none focus:border-nordic-aurora focus:ring-1 focus:ring-nordic-aurora transition"
              />
            </div>
          </div>
        </div>

        {/* Consola Principal: Grabación en Vivo / Subida */}
        <section className="bg-nordic-surface/80 border border-nordic-border rounded-3xl p-6 sm:p-8 text-center space-y-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Luz de fondo sutil */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-28 bg-nordic-aurora/10 blur-3xl pointer-events-none" />

          {/* Navegación de modo */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab("record")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === "record"
                  ? "bg-nordic-aurora/20 text-nordic-aurora border border-nordic-aurora/40"
                  : "text-nordic-muted hover:text-nordic-pearl"
              }`}
            >
              🎙️ Dictado en Directo
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === "upload"
                  ? "bg-nordic-aurora/20 text-nordic-aurora border border-nordic-aurora/40"
                  : "text-nordic-muted hover:text-nordic-pearl"
              }`}
            >
              📁 Subir Audio de Clase
            </button>
          </div>

          {activeTab === "record" ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRecording ? "bg-rose-500 animate-ping" : "bg-nordic-muted"
                    }`}
                  />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-nordic-muted">
                    {isRecording ? "Transcribiendo voz en tiempo real..." : "Listo para dictar o escuchar"}
                  </span>
                </div>
                <div
                  className={`text-5xl sm:text-6xl font-mono font-bold tracking-tight transition ${
                    isRecording ? "text-nordic-aurora" : "text-nordic-muted"
                  }`}
                >
                  {formatTime(recordSeconds)}
                </div>
              </div>

              {/* Visualizador de Onda */}
              <AudioVisualizer isRecording={isRecording} stream={stream} />

              {/* Botón Principal de Acción */}
              <div className="pt-2 flex items-center justify-center">
                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    disabled={isLoading}
                    className="group relative px-9 py-3.5 rounded-full bg-gradient-to-r from-nordic-aurora to-nordic-emerald hover:from-teal-400 hover:to-emerald-400 text-nordic-bg font-bold text-sm shadow-xl shadow-teal-950/60 flex items-center gap-3 transition transform active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Iniciar Dictado en Vivo</span>
                    <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    disabled={isLoading}
                    className="px-9 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-950/60 flex items-center gap-3 transition transform active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Finalizar y Estructurar Ficheros</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 border border-dashed border-nordic-border rounded-2xl space-y-3">
              <Upload className="w-8 h-8 text-nordic-aurora mx-auto" />
              <div>
                <p className="text-xs font-semibold text-nordic-pearl">Arrastra aquí una grabación de voz</p>
                <p className="text-[11px] text-nordic-muted">Formatos compatibles: MP3, M4A, WAV, WebM, OGG</p>
              </div>
              <input type="file" id="upload-input" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => document.getElementById("upload-input")?.click()}
                className="px-4 py-2 bg-nordic-surfaceLight hover:bg-nordic-border text-xs font-medium rounded-xl transition text-nordic-pearl"
              >
                Seleccionar Archivo
              </button>
            </div>
          )}

          {/* Indicador de procesamiento */}
          {isLoading && (
            <div className="bg-nordic-surfaceLight/90 border border-nordic-aurora/40 rounded-2xl p-3.5 flex items-center justify-center gap-3 text-nordic-aurora text-xs font-medium shadow-md">
              <div className="w-4 h-4 border-2 border-nordic-aurora border-t-transparent rounded-full animate-spin" />
              <span>{loadingMessage}</span>
            </div>
          )}
        </section>

        {/* Zona de Trabajo Dividida: Transcripción en Vivo vs Apuntes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel Izquierdo: Texto en Vivo al Momento */}
          <section className="bg-nordic-surface/80 border border-nordic-border rounded-2xl p-5 flex flex-col space-y-3 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-nordic-aurora" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-nordic-pearl">
                  Transcripción en Directo
                </h2>
                {isRecording && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/40 animate-pulse">
                    En vivo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-nordic-muted">{totalWords} palabras</span>
                <button
                  onClick={handleCopyTranscript}
                  disabled={!liveTranscript}
                  className="text-xs text-nordic-muted hover:text-nordic-pearl flex items-center gap-1 transition"
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5 text-nordic-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedTranscript ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            {/* Cuadro de texto que se va escribiendo al momento */}
            <div className="w-full flex-1 min-h-[260px] max-h-[380px] overflow-y-auto bg-nordic-bg/90 border border-nordic-border rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed space-y-2">
              {liveTranscript || interimText ? (
                <div>
                  <span>{liveTranscript}</span>
                  {interimText && <span className="text-nordic-aurora/90 italic ml-1">{interimText}</span>}
                  {isRecording && <span className="inline-block w-1.5 h-4 bg-nordic-aurora ml-1 animate-pulse align-middle" />}
                </div>
              ) : (
                <p className="text-nordic-muted/70 italic">
                  El texto dictado o hablado en clase aparecerá aquí en tiempo real según hables...
                </p>
              )}
            </div>

            <button
              onClick={() => processAndStructureLecture(liveTranscript, lastAudioPath)}
              disabled={isLoading || !liveTranscript.trim()}
              className="w-full py-2.5 bg-nordic-emerald hover:bg-emerald-400 disabled:opacity-40 text-nordic-bg font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sintetizar y Generar Ficheros Estructurados
            </button>
          </section>

          {/* Panel Derecho: Apuntes Cornell & LaTeX */}
          <section className="bg-nordic-surface/80 border border-nordic-border rounded-2xl p-5 flex flex-col space-y-3 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-nordic-emerald" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-nordic-pearl">
                  Apuntes Estructurados
                </h2>
              </div>
              <div className="flex gap-1 bg-nordic-bg p-1 rounded-lg border border-nordic-border/70">
                <button
                  onClick={() => setNotesViewMode("preview")}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium transition ${
                    notesViewMode === "preview"
                      ? "bg-nordic-surfaceLight text-nordic-pearl"
                      : "text-nordic-muted hover:text-nordic-pearl"
                  }`}
                >
                  Vista Previa
                </button>
                <button
                  onClick={() => setNotesViewMode("raw")}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium transition ${
                    notesViewMode === "raw"
                      ? "bg-nordic-surfaceLight text-nordic-pearl"
                      : "text-nordic-muted hover:text-nordic-pearl"
                  }`}
                >
                  Markdown
                </button>
              </div>
            </div>

            {notesViewMode === "preview" ? (
              <div
                className="w-full flex-1 min-h-[260px] max-h-[380px] overflow-y-auto bg-nordic-bg/90 border border-nordic-border rounded-xl p-4 text-xs prose prose-invert max-w-none text-slate-200"
                dangerouslySetInnerHTML={{
                  __html: notesMarkdown
                    ? marked.parse(notesMarkdown)
                    : "<p class='text-nordic-muted/70 italic'>Los apuntes estructurados (resumen Cornell, definiciones, fórmulas LaTeX y avisos de examen) se presentarán aquí...</p>",
                }}
              />
            ) : (
              <textarea
                value={notesMarkdown}
                onChange={(e) => setNotesMarkdown(e.target.value)}
                placeholder="Código Markdown de los apuntes..."
                className="w-full flex-1 min-h-[260px] max-h-[380px] bg-nordic-bg/90 border border-nordic-border rounded-xl p-3.5 text-xs font-mono text-slate-300 resize-none focus:outline-none"
              />
            )}

            {/* Sincronización Externa Manual */}
            <div className="pt-2 border-t border-nordic-border flex flex-wrap gap-2">
              <button
                onClick={() => handleExport("obsidian")}
                disabled={isLoading || !notesMarkdown}
                className="flex-1 min-w-[110px] py-2 bg-nordic-surfaceLight hover:bg-nordic-border border border-nordic-border/70 disabled:opacity-40 text-nordic-aurora text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                A Obsidian
              </button>
              <button
                onClick={() => handleExport("latex")}
                disabled={isLoading || !notesMarkdown}
                className="flex-1 min-w-[110px] py-2 bg-nordic-surfaceLight hover:bg-nordic-border border border-nordic-border/70 disabled:opacity-40 text-nordic-emerald text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5" />
                A LaTeX / PDF
              </button>
              <button
                onClick={() => handleExport("notion")}
                disabled={isLoading || !notesMarkdown}
                className="flex-1 min-w-[110px] py-2 bg-nordic-surfaceLight hover:bg-nordic-border border border-nordic-border/70 disabled:opacity-40 text-nordic-gold text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                A Notion
              </button>
            </div>
          </section>
        </div>

        {/* Explorador de Ficheros Estructurados Automáticos */}
        <StructuredFilesExplorer refreshTrigger={refreshFilesTrigger} />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs font-mono text-nordic-muted/50 border-t border-nordic-border/50 relative z-10">
        Murmur • Dictado en Vivo & Estructuración Automática
      </footer>
    </div>
  );
};
