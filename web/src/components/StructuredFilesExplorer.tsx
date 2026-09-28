import React, { useEffect, useState } from "react";
import {
  Folder,
  FileText,
  Download,
  RefreshCw,
  ChevronRight,
  FileCode,
  FileSpreadsheet,
  HardDrive,
  ExternalLink,
} from "lucide-react";

interface StructuredFile {
  name: string;
  path: string;
  size_bytes: number;
  modified: string;
  extension: string;
}

interface SubjectFolder {
  subject: string;
  folder: string;
  file_count: number;
  files: StructuredFile[];
}

/**
 * Componente `StructuredFilesExplorer`:
 * Muestra el árbol de almacenamiento local de Murmur en `data/clases/<Materia>/`.
 * Cada apunte generado se cataloga automáticamente en disco y se expone
 * para descarga inmediata o sincronización con herramientas de estudio (Obsidian / LaTeX / Notion).
 */
export const StructuredFilesExplorer: React.FC<{ refreshTrigger?: number }> = ({
  refreshTrigger,
}) => {
  const [tree, setTree] = useState<SubjectFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files/tree");
      const data = await res.json();
      if (data.status === "success") {
        setTree(data.tree);
        if (data.tree.length > 0 && !expandedSubject) {
          setExpandedSubject(data.tree[0].subject);
        }
      }
    } catch (e) {
      console.error("Error al obtener árbol de ficheros:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, [refreshTrigger]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileBadge = (ext: string) => {
    switch (ext) {
      case ".md":
        return {
          icon: <FileText className="w-3.5 h-3.5 text-[#00F0FF]" />,
          label: "Markdown Cornell",
          color: "text-[#00F0FF] border-[#00F0FF]/30 bg-[#00F0FF]/10",
        };
      case ".tex":
        return {
          icon: <FileCode className="w-3.5 h-3.5 text-[#10B981]" />,
          label: "LaTeX Fuente",
          color: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10",
        };
      case ".pdf":
        return {
          icon: <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />,
          label: "Documento PDF",
          color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        };
      case ".json":
        return {
          icon: <span className="text-[10px] font-mono font-bold text-amber-400">{"{}"}</span>,
          label: "Metadatos JSON",
          color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        };
      default:
        return {
          icon: <FileText className="w-3.5 h-3.5 text-slate-400" />,
          label: "Archivo",
          color: "text-slate-400 border-slate-700 bg-slate-800",
        };
    }
  };

  return (
    <section id="seccion-ficheros" className="space-y-4 pt-2">
      <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                  Bóveda de Archivos Estructurados
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40 font-mono">
                  Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Archivos generados en tu disco local bajo <code className="text-slate-300 font-mono">data/clases/</code>
              </p>
            </div>
          </div>

          <button
            onClick={fetchTree}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-[#00F0FF] transition flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-[#00F0FF]/40 bg-slate-900/60"
            title="Sincronizar explorador"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>

        {tree.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <Folder className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-300">Aún no hay archivos generados</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Finaliza un dictado en vivo o sube una grabación para catalogar apuntes en esta bóveda.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {tree.map((folder) => {
              const isExpanded = expandedSubject === folder.subject;
              return (
                <div
                  key={folder.subject}
                  className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/40 transition-all duration-300"
                >
                  <button
                    onClick={() => setExpandedSubject(isExpanded ? null : folder.subject)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <ChevronRight
                        className={`w-4 h-4 transition-transform text-[#00F0FF] ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                      <Folder className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                      <span className="font-mono text-sm tracking-tight text-white">{folder.subject}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800">
                      {folder.file_count} archivos
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-800/60 bg-slate-900/20">
                      {folder.files.map((file) => {
                        const badge = getFileBadge(file.extension);
                        return (
                          <div
                            key={file.path}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800/70 hover:border-[#00F0FF]/30 transition group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-3">
                              {badge.icon}
                              <div className="min-w-0">
                                <p className="truncate font-mono text-xs text-slate-200 group-hover:text-white font-medium">
                                  {file.name}
                                </p>
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${badge.color} inline-block mt-0.5`}>
                                  {badge.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatBytes(file.size_bytes)}
                              </span>
                              <a
                                href={`/api/files/download?file_path=${encodeURIComponent(file.path)}`}
                                download
                                className="p-1.5 text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/15 rounded-lg transition border border-transparent hover:border-[#00F0FF]/30"
                                title="Descargar fichero directo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
