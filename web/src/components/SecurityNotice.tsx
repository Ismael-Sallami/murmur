import React, { useEffect, useState } from "react";
import { ShieldAlert, ArrowRight } from "lucide-react";

export const SecurityNotice: React.FC = () => {
  const [showNotice, setShowNotice] = useState(false);
  const [adviceText, setAdviceText] = useState("");

  useEffect(() => {
    // Redirigir automáticamente si el usuario abrió 0.0.0.0
    if (window.location.hostname === "0.0.0.0") {
      window.location.replace(window.location.href.replace("0.0.0.0", "localhost"));
      return;
    }

    const isLocal =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isHttps = window.location.protocol === "https:";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setShowNotice(true);
      if (!isLocal && !isHttps) {
        setAdviceText(
          `Estás accediendo desde la dirección '${window.location.hostname}' por HTTP no seguro. Los navegadores móviles restringen el acceso al micrófono fuera de HTTPS o localhost. Utiliza una conexión HTTPS o sube los archivos grabados desde la pestaña 'Subir Audio Existente'.`
        );
      } else {
        setAdviceText(
          "Los navegadores requieren abrir 'http://localhost:8000' (en lugar de 0.0.0.0) para que el micrófono esté habilitado."
        );
      }
    }
  }, []);

  if (!showNotice) return null;

  return (
    <div className="bg-amber-950/80 border border-amber-600/60 rounded-2xl p-4 text-xs text-amber-200 flex items-start gap-3 shadow-lg backdrop-blur-sm animate-fade-in">
      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-1.5 flex-1">
        <p className="font-bold text-sm text-amber-100">
          Contexto de Seguridad del Navegador
        </p>
        <p className="text-amber-200/90 leading-relaxed">{adviceText}</p>
        {window.location.hostname !== "localhost" && (
          <a
            href={`http://localhost:${window.location.port || 8000}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition mt-1"
          >
            Abrir en localhost:{window.location.port || 8000}
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
