"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDictationSession, type DictationPhase, type Recognition } from "./dictation-session";

type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export default function DictationTextarea({ value, onChange, active, voice = true }: { value: string; onChange: (text: string) => void; active: boolean; voice?: boolean }) {
  const [phase, setPhase] = useState<DictationPhase | "idle">("idle");
  const [error, setError] = useState("");
  const session = useRef<ReturnType<typeof createDictationSession> | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  useEffect(() => {
    if (!active || !voice) {
      session.current?.dispose();
      session.current = null;
      setPhase("idle");
    }
    return () => { session.current?.dispose(); session.current = null; };
  }, [active, voice]);
  function toggle() {
    if (session.current) { session.current.stop(); return; }
    if (!window.isSecureContext) {
      setError("El micrófono necesita una conexión HTTPS o localhost. Abre el sistema con una conexión segura.");
      return;
    }
    const browser = window as RecognitionWindow;
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) { setError("Este navegador no permite dictado. Puedes escribir el resumen normalmente."); return; }
    setError("");
    const current = createDictationSession(new Constructor(), latest.current.value, {
      change: text => { latest.current.value = text; latest.current.onChange(text); },
      phase: setPhase,
      end: () => { session.current = null; setPhase("idle"); },
      error: code => setError(code === "not-allowed" || code === "service-not-allowed"
        ? "Permite el acceso al micrófono en el navegador para dictar."
        : code === "audio-capture" ? "No se encuentra un micrófono disponible. Revisa su conexión."
        : code === "no-speech" ? "No se detectó voz. Puedes iniciar el dictado otra vez."
        : code === "network" ? "No se pudo conectar al servicio de dictado. Revisa tu conexión e intenta otra vez."
        : code === "microphone-timeout" ? "El navegador no confirmó la captura de audio. Revisa el permiso del micrófono y el dispositivo de entrada seleccionado."
        : code === "no-result" ? "El micrófono se activó, pero el navegador no entregó texto. Revisa que el micrófono seleccionado reciba tu voz. Si continúa, prueba en Google Chrome."
        : code === "language-not-supported" ? "El servicio de voz del navegador no admite el idioma español configurado. Prueba en Google Chrome."
        : "No se pudo iniciar o continuar el dictado. Revisa el micrófono y vuelve a intentarlo."),
    });
    session.current = current;
    current.start();
  }
  return <div className="space-y-2">
    {voice && <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={toggle} disabled={!active || phase === "stopping"}>
        {phase !== "idle" ? <Square size={14} className="mr-1 text-red-600" /> : <Mic size={14} className="mr-1" />}
        {phase === "stopping" ? "Finalizando dictado…" : phase !== "idle" ? "Detener dictado" : "Dictar resumen"}
      </Button>
      <span role="status" className="text-xs text-gray-500">{
        phase === "starting" ? "Activando micrófono. Permite su uso si el navegador lo solicita…"
        : phase === "listening" ? "Micrófono activo. Habla para escribir el resumen…"
        : phase === "recognizing" ? "Voz detectada. Transcribiendo…"
        : phase === "stopping" ? "Recibiendo las últimas palabras…"
        : "Puedes dictar y después corregir el texto."
      }</span>
    </div>}
    <textarea aria-label="Resumen de acuerdos y novedades" className="w-full min-h-80px rounded-md border border-gray-300 p-3 text-sm" value={value} readOnly={phase !== "idle"} onChange={e => onChange(e.target.value)} placeholder="Con quién hablaste, gestión realizada, acuerdos, novedades y próximo paso…" />
    {error && <p role="alert" className="text-xs text-amber-700">{error}</p>}
  </div>;
}
