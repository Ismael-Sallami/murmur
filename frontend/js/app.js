/**
 * AulaScribe - Controlador Frontend de la PWA
 * Gestiona la captura de audio en directo, subidas, llamadas a la API y renderizado.
 */

let mediaRecorder = null;
let audioChunks = [];
let recordInterval = null;
let recordSeconds = 0;
let currentSessionId = null;
let currentChunkIndex = 0;
let lastUploadedAudioPath = null;
let currentNotesMarkdown = "";

// Elementos del DOM
const tabRecord = document.getElementById("tab-record");
const tabUpload = document.getElementById("tab-upload");
const panelRecord = document.getElementById("panel-record");
const panelUpload = document.getElementById("panel-upload");
const btnToggleRecord = document.getElementById("btn-toggle-record");
const btnRecordText = document.getElementById("btn-record-text");
const btnRecordIcon = document.getElementById("btn-record-icon");
const recordTimer = document.getElementById("record-timer");
const recordStatusDesc = document.getElementById("record-status-desc");
const fileInput = document.getElementById("file-input");
const fileInfo = document.getElementById("file-info");
const loadingSpinner = document.getElementById("loading-spinner");
const loadingText = document.getElementById("loading-text");
const outputTranscript = document.getElementById("output-transcript");
const btnGenerateNotes = document.getElementById("btn-generate-notes");
const previewNotes = document.getElementById("preview-notes");
const rawNotes = document.getElementById("raw-notes");
const btnViewPreview = document.getElementById("btn-view-preview");
const btnViewRaw = document.getElementById("btn-view-raw");
const btnCopyTranscript = document.getElementById("btn-copy-transcript");

const btnExportObsidian = document.getElementById("btn-export-obsidian");
const btnExportLatex = document.getElementById("btn-export-latex");
const btnExportNotion = document.getElementById("btn-export-notion");
const inputSubject = document.getElementById("input-subject");
const inputTitle = document.getElementById("input-title");

// --- Cambio de Pestañas ---
tabRecord.addEventListener("click", () => {
  tabRecord.className = "pb-3 text-sm font-semibold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2";
  tabUpload.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2";
  panelRecord.classList.remove("hidden");
  panelUpload.classList.add("hidden");
});

tabUpload.addEventListener("click", () => {
  tabUpload.className = "pb-3 text-sm font-semibold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2";
  tabRecord.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2";
  panelUpload.classList.remove("hidden");
  panelRecord.classList.add("hidden");
});

// --- Grabación en Directo (Push & Stream por Chunks) ---
btnToggleRecord.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    await startRecording();
  } else {
    await stopRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Identificador único de sesión para los chunks
    currentSessionId = "class_" + Date.now();
    currentChunkIndex = 0;
    recordSeconds = 0;

    // Usar WebM con Opus si el navegador lo soporta
    const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? { mimeType: "audio/webm;codecs=opus" }
      : {};

    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        await sendAudioChunk(event.data, currentSessionId, currentChunkIndex);
        currentChunkIndex++;
      }
    };

    // Cortar y emitir chunks cada 30 segundos de clase para seguridad anti-fallos
    mediaRecorder.start(30000);

    // Actualizar UI
    btnToggleRecord.className = "relative group px-8 py-4 rounded-full bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-base shadow-lg flex items-center gap-3 transition";
    btnRecordText.textContent = "Finalizar Grabación";
    btnRecordIcon.className = "w-4 h-4 rounded-sm bg-red-500";
    recordStatusDesc.textContent = "🔴 Grabando clase en directo...";
    recordTimer.classList.remove("text-slate-400");
    recordTimer.classList.add("text-red-400");

    recordInterval = setInterval(() => {
      recordSeconds++;
      const hrs = String(Math.floor(recordSeconds / 3600)).padStart(2, "0");
      const mins = String(Math.floor((recordSeconds % 3600) / 60)).padStart(2, "0");
      const secs = String(recordSeconds % 60).padStart(2, "0");
      recordTimer.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);

  } catch (err) {
    alert("No se pudo acceder al micrófono: " + err.message);
  }
}

async function stopRecording() {
  if (!mediaRecorder) return;

  clearInterval(recordInterval);
  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(track => track.stop());

  btnToggleRecord.className = "relative group px-8 py-4 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-base shadow-lg shadow-red-950/40 flex items-center gap-3 transition";
  btnRecordText.textContent = "Iniciar Grabación";
  btnRecordIcon.className = "w-4 h-4 rounded-full bg-white animate-ping";
  recordStatusDesc.textContent = "Ensamblando audio de la clase...";

  showLoading("Ensamblando fragmentos de audio de la clase con ffmpeg...");

  try {
    const formData = new FormData();
    formData.append("session_id", currentSessionId);

    const res = await fetch("/api/audio/finalize", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error al ensamblar audio");

    lastUploadedAudioPath = data.merged_path;
    recordStatusDesc.textContent = "Audio ensamblado. Iniciando Whisper...";

    // Transcribir automáticamente
    await triggerTranscription(lastUploadedAudioPath);

  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    hideLoading();
  }
}

async function sendAudioChunk(blob, sessionId, index) {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("chunk_index", index);
  formData.append("chunk", blob, `chunk_${index}.webm`);

  try {
    await fetch("/api/audio/chunk", {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    console.error("Error al enviar chunk de audio:", e);
  }
}

// --- Subida de Archivo Existente ---
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  fileInfo.textContent = `Archivo seleccionado: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  fileInfo.classList.remove("hidden");

  showLoading(`Subiendo ${file.name} al servidor...`);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/audio/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Fallo en subida");

    lastUploadedAudioPath = data.path;
    await triggerTranscription(lastUploadedAudioPath);
  } catch (err) {
    alert("Error al subir archivo: " + err.message);
  } finally {
    hideLoading();
  }
});

// --- Disparador de Transcripción Whisper ---
async function triggerTranscription(audioPath) {
  showLoading("Transcribiendo clase con Whisper...");
  try {
    const res = await fetch("/api/audio/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_path: audioPath }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error en Whisper");

    outputTranscript.value = data.text;
  } catch (err) {
    alert("Error en transcripción: " + err.message);
  } finally {
    hideLoading();
  }
}

// --- Generación de Apuntes con LLM ---
btnGenerateNotes.addEventListener("click", async () => {
  const transcript = outputTranscript.value.trim();
  if (!transcript) {
    alert("Primero debes grabar o transcribir una clase.");
    return;
  }

  showLoading("Sintetizando apuntes en formato Cornell y fórmulas LaTeX con LLM...");

  try {
    const res = await fetch("/api/notes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: transcript,
        subject: inputSubject.value.trim() || "General",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error al generar apuntes");

    currentNotesMarkdown = data.notes;
    rawNotes.value = currentNotesMarkdown;
    previewNotes.innerHTML = marked.parse(currentNotesMarkdown);

  } catch (err) {
    alert("Error generando apuntes: " + err.message);
  } finally {
    hideLoading();
  }
});

// --- Conmutador Vista Previa / Markdown Crudo ---
btnViewPreview.addEventListener("click", () => {
  btnViewPreview.className = "text-xs px-2 py-1 rounded bg-slate-700 text-white font-medium";
  btnViewRaw.className = "text-xs px-2 py-1 rounded text-slate-400 hover:text-white";
  previewNotes.classList.remove("hidden");
  rawNotes.classList.add("hidden");
});

btnViewRaw.addEventListener("click", () => {
  btnViewRaw.className = "text-xs px-2 py-1 rounded bg-slate-700 text-white font-medium";
  btnViewPreview.className = "text-xs px-2 py-1 rounded text-slate-400 hover:text-white";
  rawNotes.classList.remove("hidden");
  previewNotes.classList.add("hidden");
});

// --- Copiar Transcripción ---
btnCopyTranscript.addEventListener("click", () => {
  navigator.clipboard.writeText(outputTranscript.value);
  btnCopyTranscript.textContent = "¡Copiado!";
  setTimeout(() => (btnCopyTranscript.textContent = "Copiar"), 2000);
});

// --- Exportaciones MCP ---
async function handleExport(target) {
  const content = currentNotesMarkdown || rawNotes.value;
  if (!content) {
    alert("No hay apuntes generados para exportar.");
    return;
  }

  showLoading(`Exportando a ${target.toUpperCase()} vía MCP...`);

  try {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: target,
        title: inputTitle.value.trim() || "Apuntes_Clase",
        content: content,
        subject: inputSubject.value.trim() || "General",
        compile_pdf: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error de exportación");

    if (target === "obsidian") {
      alert(`✅ Nota exportada a Obsidian correctamente:\n${data.file_path}`);
    } else if (target === "latex") {
      const msg = data.pdf_path
        ? `✅ Documento LaTeX y PDF compilado con éxito:\n${data.pdf_path}`
        : `✅ Archivo LaTeX (.tex) generado:\n${data.tex_path}`;
      alert(msg);
    } else if (target === "notion") {
      alert(`✅ Página creada en Notion exitosamente.`);
    }

  } catch (err) {
    alert(`Error al exportar a ${target}: ` + err.message);
  } finally {
    hideLoading();
  }
}

btnExportObsidian.addEventListener("click", () => handleExport("obsidian"));
btnExportLatex.addEventListener("click", () => handleExport("latex"));
btnExportNotion.addEventListener("click", () => handleExport("notion"));

// --- Utilidades de UI ---
function showLoading(msg) {
  loadingText.textContent = msg;
  loadingSpinner.classList.remove("hidden");
}

function hideLoading() {
  loadingSpinner.classList.add("hidden");
}
