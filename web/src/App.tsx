import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { marked } from "marked";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { SecurityNotice } from "./components/SecurityNotice";
import { MurmurBackground } from "./components/MurmurBackground";
import { StructuredFilesExplorer } from "./components/StructuredFilesExplorer";
import { soundScape } from "./audio/soundScape";

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

  // Resultados
  const [transcript, setTranscript] = useState("");
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

  // Iniciar grabación en directo
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
      setIsOrderedState(false); // Volver al murmullo

      const sessionId = "class_" + Date.now();
      sessionIdRef.current = sessionId;

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : {};

      const recorder = new MediaRecorder(audioStream, options);
      mediaRecorderRef.current = recorder;

      let currentChunkIdx = 0;
      recorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          const chunkIdx = currentChunkIdx++;
          setChunkCount(chunkIdx + 1);

          const formData = new FormData();
          formData.append("session_id", sessionId);
          formData.append("chunk_index", String(chunkIdx));
          formData.append("chunk", event.data, `chunk_${chunkIdx}.webm`);

          try {
            await fetch("/api/audio/chunk", { method: "POST", body: formData });
          } catch (e) {
            console.error("Error al enviar chunk:", e);
          }
        }
      };

      recorder.start(30000);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);

      showToast("Grabación iniciada en directo.", "info");
    } catch (err: any) {
      showToast("Error al abrir micrófono: " + err.message, "error");
    }
  };

  // Detener grabación y procesar automáticamente
  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current.stop();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsRecording(false);

    setIsLoading(true);
    setLoadingMessage("Ensamblando fragmentos de la clase...");

    try {
      const formData = new FormData();
      formData.append("session_id", sessionIdRef.current);

      const res = await fetch("/api/audio/finalize", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al ensamblar audio");

      setLastAudioPath(data.merged_path);
      await triggerTranscription(data.merged_path);
    } catch (err: any) {
      showToast(err.message, "error");
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
      await triggerTranscription(data.path);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Transcripción Whisper
  const triggerTranscription = async (audioPath: string) => {
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

      setTranscript(data.text);
      showToast("Transcripción completada con éxito.", "success");
    } catch (err: any) {
      showToast("Error en transcripción: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Generación de apuntes y auto-estructuración en ficheros
  const handleGenerateNotes = async () => {
    if (!transcript.trim()) {
      showToast("Primero debes grabar o subir un audio de clase.", "error");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Sintetizando apuntes y organizando ficheros estructurados...");

    try {
      // 1. Llamar al LLM para sintetizar los apuntes Cornell
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript,
          subject: subject.trim() || "General",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al generar apuntes");

      const generatedNotes = data.notes;
      setNotesMarkdown(generatedNotes);

      // 2. Momento mágico: Transición acústica y visual del Murmullo al Orden
      setIsOrderedState(true);
      soundScape.transitionToOrder();

      // 3. Estructurar y guardar automáticamente los ficheros en disco (.md, .tex, .pdf, .json, .txt)
      const autoRes = await fetch("/api/files/auto-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || "General",
          title: title.trim() || "Tema_Clase",
          transcript: transcript,
          notes_md: generatedNotes,
          audio_path: lastAudioPath,
        }),
      });
      const autoData = await autoRes.json();
      if (autoRes.ok) {
        setRefreshFilesTrigger((prev) => prev + 1);
        showToast(
          `✨ Del murmullo al orden: Ficheros estructurados guardados en /${subject}/`,
          "success"
        );
      }
    } catch (err: any) {
      showToast("Error en procesamiento: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Exportaciones MCP manuales adicionales
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
    navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  return (
    <div className="min-h-screen bg-nordic-bg text-nordic-pearl flex flex-col font-sans relative overflow-x-hidden">
      {/* Lienzo Visual: Del Murmullo al Orden */}
      <MurmurBackground isOrdered={isOrderedState} />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            toast.type === "success"
              ? "bg-nordic-surface/90 text-nordic-emerald border-nordic-emerald/50"
              : toast.type === "error"
              ? "bg-rose-950/90 text-rose-300 border-rose-700"
              : "bg-nordic-surface/90 text-nordic-aurora border-nordic-aurora/50"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Nordic Aurora */}
      <header className="bg-nordic-surface/80 backdrop-blur-md border-b border-nordic-border sticky top-0 z-40 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-nordic-aurora/30 to-nordic-emerald/30 border border-nordic-aurora/40 flex items-center justify-center text-nordic-aurora shadow-lg shadow-teal-950/50">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-nordic-pearl">
                  Murmur
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-nordic-aurora/15 text-nordic-aurora border border-nordic-aurora/30">
                  Nordic Aurora
                </span>
              </div>
              <p className="text-[11px] text-nordic-muted">Del Murmullo al Orden • Whisper + LLMs + MCP</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón de Sonido Ambiental de Calma */}
            <button
              onClick={toggleAmbientAudio}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                ambientAudioActive
                  ? "bg-nordic-aurora/20 text-nordic-aurora border-nordic-aurora/50 shadow-md shadow-teal-950/50"
                  : "bg-nordic-surfaceLight/60 text-nordic-muted border-nordic-border hover:text-nordic-pearl"
              }`}
              title="Activar/Desactivar murmullo ambiental sutil para concentración"
            >
              {ambientAudioActive ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Murmullo Calmo</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-nordic-surfaceLight text-nordic-emerald border border-nordic-emerald/40">
              <span className="w-2 h-2 rounded-full bg-nordic-emerald animate-ping"></span>
              En Línea
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6 relative z-10">
        {/* Banner de contexto seguro */}
        <SecurityNotice />

        {/* Tarjeta de Parámetros de la Clase */}
        <div className="bg-nordic-surface/80 border border-nordic-border rounded-2xl p-5 shadow-sm space-y-4 backdrop-blur-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-nordic-muted mb-1.5">
                Asignatura / Materia
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Física Teórica, Álgebra Lineal..."
                className="w-full bg-nordic-bg/90 border border-nordic-border rounded-xl px-3.5 py-2.5 text-sm text-nordic-pearl focus:outline-none focus:border-nordic-aurora focus:ring-1 focus:ring-nordic-aurora transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-nordic-muted mb-1.5">
                Título o Tema de la Sesión
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Tema 1: Principios y Ecuaciones..."
                className="w-full bg-nordic-bg/90 border border-nordic-border rounded-xl px-3.5 py-2.5 text-sm text-nordic-pearl focus:outline-none focus:border-nordic-aurora focus:ring-1 focus:ring-nordic-aurora transition"
              />
            </div>
          </div>
        </div>

        {/* Pestañas: Grabar vs Subir */}
        <div className="flex border-b border-nordic-border gap-6">
          <button
            onClick={() => setActiveTab("record")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "record"
                ? "border-nordic-aurora text-nordic-aurora"
                : "border-transparent text-nordic-muted hover:text-nordic-pearl"
            }`}
          >
            <Mic className="w-4 h-4 text-rose-400" />
            Grabación en Directo
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "upload"
                ? "border-nordic-aurora text-nordic-aurora"
                : "border-transparent text-nordic-muted hover:text-nordic-pearl"
            }`}
          >
            <Upload className="w-4 h-4" />
            Subir Audio de Clase
          </button>
        </div>

        {/* Panel 1: Grabación en Directo */}
        {activeTab === "record" ? (
          <section className="bg-nordic-surface/80 border border-nordic-border rounded-2xl p-6 text-center space-y-5 backdrop-blur-md shadow-xl">
            <div className="space-y-1">
              <p className="text-xs text-nordic-muted">Captura el audio de la clase en tiempo real desde el micrófono</p>
              <div
                className={`text-5xl font-mono font-bold tracking-tight transition ${
                  isRecording ? "text-rose-400 animate-pulse" : "text-nordic-muted"
                }`}
              >
                {formatTime(recordSeconds)}
              </div>
              {isRecording && (
                <p className="text-xs text-nordic-muted">
                  Fragmentos seguros sincronizados: <span className="text-nordic-aurora font-bold">{chunkCount}</span>
                </p>
              )}
            </div>

            {/* Visualizador de Onda Dinámico */}
            <AudioVisualizer isRecording={isRecording} stream={stream} />

            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  disabled={isLoading}
                  className="px-8 py-3.5 rounded-full bg-nordic-aurora hover:bg-teal-400 active:scale-95 text-nordic-bg font-bold text-sm shadow-xl shadow-teal-950/50 flex items-center gap-2.5 transition"
                >
                  <Mic className="w-4 h-4" />
                  Iniciar Grabación
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  disabled={isLoading}
                  className="px-8 py-3.5 rounded-full bg-nordic-surfaceLight hover:bg-nordic-border active:scale-95 text-nordic-pearl font-bold text-sm shadow-xl flex items-center gap-2.5 transition border border-nordic-border"
                >
                  <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
                  Finalizar y Procesar Clase
                </button>
              )}
            </div>

            <p className="text-[11px] text-nordic-muted/80">
              🛡️ Protección continua: El audio se fragmenta y almacena en el servidor cada 30 segundos para prevenir pérdidas ante desconexiones.
            </p>
          </section>
        ) : (
          /* Panel 2: Subida de archivo */
          <section className="bg-nordic-surface/80 border border-nordic-border border-dashed rounded-2xl p-8 text-center space-y-4 backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-nordic-surfaceLight flex items-center justify-center mx-auto text-nordic-aurora">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-nordic-pearl">Arrastra un archivo de audio grabado en clase</p>
              <p className="text-xs text-nordic-muted mt-1">Soporta formatos estándar: MP3, M4A (iPhone), WAV, WebM, OGG</p>
            </div>
            <input type="file" id="upload-input" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => document.getElementById("upload-input")?.click()}
              className="px-5 py-2.5 bg-nordic-surfaceLight hover:bg-nordic-border text-sm font-medium rounded-xl transition border border-nordic-border text-nordic-pearl"
            >
              Examinar Archivo
            </button>
          </section>
        )}

        {/* Indicador de carga */}
        {isLoading && (
          <div className="bg-nordic-surface/90 border border-nordic-aurora/50 rounded-2xl p-4 flex items-center gap-3 text-nordic-aurora shadow-lg animate-pulse">
            <div className="w-5 h-5 border-2 border-nordic-aurora border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">{loadingMessage}</span>
          </div>
        )}

        {/* Sección de Resultados Dividida */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel Izquierdo: Transcripción Whisper */}
          <section className="bg-nordic-surface/80 border border-nordic-border rounded-2xl p-5 flex flex-col space-y-3 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-nordic-muted font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-nordic-aurora" />
                <span>Transcripción Whisper (El Murmullo)</span>
              </div>
              <button
                onClick={handleCopyTranscript}
                disabled={!transcript}
                className="text-xs text-nordic-muted hover:text-nordic-pearl flex items-center gap-1 transition"
              >
                {copiedTranscript ? <Check className="w-3.5 h-3.5 text-nordic-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedTranscript ? "Copiado" : "Copiar"}
              </button>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="La transcripción literal de la clase aparecerá aquí..."
              className="w-full flex-1 min-h-[220px] bg-nordic-bg/90 border border-nordic-border rounded-xl p-3.5 text-xs font-mono text-slate-300 resize-none focus:outline-none focus:border-nordic-aurora"
            />
            <button
              onClick={handleGenerateNotes}
              disabled={isLoading || !transcript}
              className="w-full py-2.5 bg-nordic-emerald hover:bg-emerald-400 disabled:opacity-50 text-nordic-bg font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sintetizar y Organizar en Ficheros Estructurados
            </button>
          </section>

          {/* Panel Derecho: Apuntes Académicos y Exportación */}
          <section className="bg-nordic-surface/80 border border-nordic-border rounded-2xl p-5 flex flex-col space-y-3 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-nordic-muted font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-nordic-emerald" />
                <span>Apuntes Cornell & LaTeX (El Orden)</span>
              </div>
              <div className="flex gap-1.5 bg-nordic-bg p-1 rounded-lg border border-nordic-border">
                <button
                  onClick={() => setNotesViewMode("preview")}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium transition ${
                    notesViewMode === "preview" ? "bg-nordic-surfaceLight text-nordic-pearl" : "text-nordic-muted hover:text-nordic-pearl"
                  }`}
                >
                  Vista Previa
                </button>
                <button
                  onClick={() => setNotesViewMode("raw")}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium transition ${
                    notesViewMode === "raw" ? "bg-nordic-surfaceLight text-nordic-pearl" : "text-nordic-muted hover:text-nordic-pearl"
                  }`}
                >
                  Markdown
                </button>
              </div>
            </div>

            {notesViewMode === "preview" ? (
              <div
                className="w-full flex-1 min-h-[220px] max-h-[360px] overflow-y-auto bg-nordic-bg/90 border border-nordic-border rounded-xl p-4 text-xs prose prose-invert max-w-none text-slate-200"
                dangerouslySetInnerHTML={{
                  __html: notesMarkdown
                    ? marked.parse(notesMarkdown)
                    : "<p class='text-nordic-muted italic'>Los apuntes estructurados con formato Cornell, fórmulas matemáticas y preguntas de examen se generarán aquí al pulsar 'Sintetizar'...</p>",
                }}
              />
            ) : (
              <textarea
                value={notesMarkdown}
                onChange={(e) => setNotesMarkdown(e.target.value)}
                placeholder="Código Markdown de los apuntes..."
                className="w-full flex-1 min-h-[220px] max-h-[360px] bg-nordic-bg/90 border border-nordic-border rounded-xl p-3.5 text-xs font-mono text-slate-300 resize-none focus:outline-none"
              />
            )}

            {/* Sincronización Externa Manual */}
            <div className="pt-2 border-t border-nordic-border flex flex-wrap gap-2">
              <button
                onClick={() => handleExport("obsidian")}
                disabled={isLoading || !notesMarkdown}
                className="flex-1 min-w-[110px] py-2 bg-nordic-surfaceLight hover:bg-nordic-border border border-nordic-border disabled:opacity-50 text-nordic-aurora text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                A Obsidian
              </button>
              <button
                onClick={() => handleExport("latex")}
                disabled={isLoading || !notesMarkdown}
                className="flex-1 min-w-[110px] py-2 bg-nordic-surfaceLight hover:bg-nordic-border border border-nordic-border disabled:opacity-50 text-nordic-emerald text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FileCode className="w-3.5 h-3.5" />
                A LaTeX / PDF
              </button>
              <button
                onClick={() => handleExport("notion")}
                disabled={isLoading || !notesMarkdown}
                className="flex-1 min-w-[110px] py-2 bg-nordic-surfaceLight hover:bg-nordic-border border border-nordic-border disabled:opacity-50 text-nordic-gold text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
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
      <footer className="text-center py-4 text-xs text-nordic-muted/60 border-t border-nordic-border/60 relative z-10">
        Murmur • Nordic Aurora • Whisper + LLM + Model Context Protocol
      </footer>
    </div>
  );
};
