import React, { useEffect, useState } from "react";
import {
  Folder,
  FileText,
  Download,
  RefreshCw,
  ChevronRight,
  FileCode,
  FileSpreadsheet,
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
        return { icon: <FileText className="w-4 h-4 text-mint" />, label: "Markdown Cornell" };
      case ".tex":
        return { icon: <FileCode className="w-4 h-4 text-mist" />, label: "LaTeX" };
      case ".pdf":
        return { icon: <FileSpreadsheet className="w-4 h-4 text-lilac" />, label: "PDF" };
      case ".json":
        return {
          icon: <span className="text-[11px] font-mono font-bold text-peach">{"{}"}</span>,
          label: "Metadatos",
        };
      default:
        return { icon: <FileText className="w-4 h-4 text-chalk-muted" />, label: "Archivo" };
    }
  };

  return (
    <section id="seccion-ficheros" className="scroll-mt-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">Tus archivos</h2>
          <p className="mt-2 text-chalk-muted">
            Guardados en <code className="font-mono text-[13px] text-chalk-soft">data/clases/</code>, una carpeta por asignatura.
          </p>
        </div>
        <button onClick={fetchTree} disabled={loading} className="btn-ghost shrink-0" title="Volver a leer la carpeta">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refrescar</span>
        </button>
      </div>

      <div className="night-card mt-8 p-4 sm:p-6">
        {tree.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
            <Folder className="w-8 h-8 text-chalk-faint mx-auto mb-3" />
            <p className="font-display font-semibold text-lg text-chalk">Aún no hay apuntes</p>
            <p className="text-sm text-chalk-muted mt-1">
              Termina un dictado o sube una grabación y aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {tree.map((folder) => {
              const isExpanded = expandedSubject === folder.subject;
              return (
                <div key={folder.subject} className="border border-white/[0.08] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSubject(isExpanded ? null : folder.subject)}
                    className="w-full px-4 py-3.5 text-left flex items-center justify-between hover:bg-night-soft transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <ChevronRight
                        className={`w-4 h-4 text-chalk-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                      <Folder className="w-4 h-4 text-lilac" />
                      <span className="font-display font-semibold text-lg text-chalk">{folder.subject}</span>
                    </div>
                    <span className="text-xs text-chalk-muted px-2.5 py-1 rounded-full border border-white/10">
                      {folder.file_count} archivos
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/5">
                      {folder.files.map((file) => {
                        const badge = getFileBadge(file.extension);
                        return (
                          <div
                            key={file.path}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-night-soft border border-transparent hover:border-white/10 transition group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              {badge.icon}
                              <div className="min-w-0">
                                <p className="truncate text-sm text-chalk font-medium">{file.name}</p>
                                <span className="text-xs text-chalk-muted">{badge.label}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-chalk-muted font-mono">{formatBytes(file.size_bytes)}</span>
                              <a
                                href={`/api/files/download?file_path=${encodeURIComponent(file.path)}`}
                                download
                                className="p-2 text-chalk-muted hover:text-chalk hover:bg-mint/15 hover:text-mint rounded-lg transition"
                                title="Descargar fichero"
                              >
                                <Download className="w-4 h-4" />
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
