import { useState, useRef, useCallback } from "react";

interface UseLiveSpeechOptions {
  lang?: string;
  onFinalTranscript?: (text: string) => void;
}

export function useLiveSpeech({ lang = "es-ES", onFinalTranscript }: UseLiveSpeechOptions = {}) {
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fullTextRef = useRef<string>("");

  const startListening = useCallback(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn("SpeechRecognition API no soportada en este navegador.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript + " ";
          } else {
            interim += item[0].transcript;
          }
        }

        if (final) {
          fullTextRef.current += final;
          setLiveTranscript(fullTextRef.current);
          if (onFinalTranscript) {
            onFinalTranscript(fullTextRef.current);
          }
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          console.warn("Aviso en reconocimiento de voz en vivo:", event.error);
        }
      };

      recognition.onend = () => {
        // Si seguimos en modo escucha, reanudar
        if (recognitionRef.current && isListening) {
          try {
            recognition.start();
          } catch {}
        } else {
          setIsListening(false);
          setInterimText("");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Fallo al iniciar SpeechRecognition:", e);
    }
  }, [lang, isListening, onFinalTranscript]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setInterimText("");
    return fullTextRef.current;
  }, []);

  const resetTranscript = useCallback(() => {
    fullTextRef.current = "";
    setLiveTranscript("");
    setInterimText("");
  }, []);

  return {
    liveTranscript,
    interimText,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    setLiveTranscript,
  };
}
