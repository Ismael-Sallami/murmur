import React, { useEffect, useState } from "react";
import { Folder, FileText, Download, RefreshCw, CheckCircle2, ChevronRight, FileCode, FileSpreadsheet } from "lucide-react";

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

export const StructuredFilesExplorer: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
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
        // Expandir la primera asignatura por defecto
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

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case ".md":
        return <FileText className="w-4 h-4 text-nordic-aurora" />;
      case ".tex":
        return <FileCode className="w-4 h-4 text-nordic-emerald" />;
      case ".pdf":
        return <FileSpreadsheet className="w-4 h-4 text-rose-400" />;
      case ".json":
        return <span className="text-xs font-mono font-bold text-amber-400">{"{}"}</span>;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-nordic-surface/80 border border-nordic-border rounded-2xl p-5 backdrop-blur-md space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-nordic-aurora" />
          <h3 className="text-sm font-bold tracking-wide text-nordic-pearl uppercase">
            Ficheros Estructurados Automáticos
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-nordic-emerald/20 text-nordic-emerald border border-nordic-emerald/40 font-mono">
            Auto-Sync
          </span>
        </div>
        <button
          onClick={fetchTree}
          disabled={loading}
          className="text-xs text-nordic-muted hover:text-nordic-aurora transition flex items-center gap-1.5 p-1 rounded-lg hover:bg-nordic-surfaceLight"
          title="Actualizar ficheros"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-xs text-nordic-muted">
        Las clases se organizan automáticamente en carpetas por asignatura con transcripciones, apuntes Cornell, fórmulas LaTeX y metadatos.
      </p>

      {tree.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-nordic-border rounded-xl">
          Aún no hay ficheros estructurados. Graba o sube una clase para generarlos automáticamente.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {tree.map((folder) => {
            const isExpanded = expandedSubject === folder.subject;
            return (
              <div key={folder.subject} className="border border-nordic-border/70 rounded-xl overflow-hidden bg-nordic-bg/50">
                <button
                  onClick={() => setExpandedSubject(isExpanded ? null : folder.subject)}
                  className="w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs font-semibold text-nordic-pearl hover:bg-nordic-surfaceLight/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform text-nordic-aurora ${isExpanded ? "rotate-90" : ""}`} />
                    <span>📁 {folder.subject}</span>
                  </div>
                  <span className="text-[10px] text-nordic-muted font-mono bg-nordic-surfaceLight px-2 py-0.5 rounded-md">
                    {folder.file_count} ficheros
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-2.5 pt-1 space-y-1.5 border-t border-nordic-border/40">
                    {folder.files.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-nordic-surface/60 hover:bg-nordic-surfaceLight/80 transition text-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {getFileIcon(file.extension)}
                          <span className="truncate font-mono text-[11px] text-slate-300 group-hover:text-nordic-pearl">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-nordic-muted font-mono">
                            {formatBytes(file.size_bytes)}
                          </span>
                          <a
                            href={`/api/files/download?file_path=${encodeURIComponent(file.path)}`}
                            download
                            className="p-1 text-nordic-muted hover:text-nordic-emerald hover:bg-nordic-emerald/20 rounded transition"
                            title="Descargar fichero"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
