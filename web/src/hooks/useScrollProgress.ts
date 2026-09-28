import { useState, useEffect } from "react";

/**
 * Interface que representa las métricas y telemetría de desplazamiento (scroll)
 * en la interfaz de Murmur.
 */
export interface ScrollMetrics {
  /** Píxeles actuales de desplazamiento vertical */
  scrollY: number;
  /** Porcentaje completado de lectura o navegación (0 a 100) */
  progress: number;
  /** Dirección del movimiento: 'down' | 'up' */
  direction: "down" | "up";
  /** Identificador de la sección actualmente visible según umbrales */
  activeSection: string;
}

/**
 * Hook `useScrollProgress`:
 * Monitorea el desplazamiento de la ventana mediante `requestAnimationFrame`
 * para garantizar 60fps/120fps fluidos sin bloquear el hilo principal.
 * 
 * Permite que los fondos de Aurora Nórdica reaccionen con efecto parallax,
 * y que las tarjetas y líneas de progreso se sincronicen con el descenso de la página.
 */
export const useScrollProgress = (): ScrollMetrics => {
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    scrollY: 0,
    progress: 0,
    direction: "down",
    activeSection: "hero",
  });

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (currentScrollY / maxScroll) * 100)) : 0;
          const direction = currentScrollY > lastScrollY ? "down" : "up";

          // Detección de sección activa basada en posición
          let activeSection = "hero";
          const recorderElem = document.getElementById("seccion-consola");
          const notesElem = document.getElementById("seccion-apuntes");
          const pipelineElem = document.getElementById("seccion-pipeline");
          const filesElem = document.getElementById("seccion-ficheros");

          const offsetTrigger = window.innerHeight * 0.35;

          if (filesElem && filesElem.getBoundingClientRect().top <= offsetTrigger) {
            activeSection = "files";
          } else if (pipelineElem && pipelineElem.getBoundingClientRect().top <= offsetTrigger) {
            activeSection = "pipeline";
          } else if (notesElem && notesElem.getBoundingClientRect().top <= offsetTrigger) {
            activeSection = "notes";
          } else if (recorderElem && recorderElem.getBoundingClientRect().top <= offsetTrigger) {
            activeSection = "recorder";
          }

          setMetrics({
            scrollY: currentScrollY,
            progress,
            direction,
            activeSection,
          });

          lastScrollY = currentScrollY;
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Disparo inicial
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return metrics;
};
