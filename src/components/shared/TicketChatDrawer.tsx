"use client";

import { usePermissions, Allowed } from "@/components/shared/PermissionsProvider";
import { ArrowLeft } from "lucide-react";
import TicketAttachments, { pegarArchivosTicket } from "@/components/shared/TicketAttachments";
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Paperclip,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
  Download,
  Mic, Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TicketChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number | null;
  currentUserId: string;
  currentUserRol: string;
}

export default function TicketChatDrawer({
  isOpen,
  onClose,
  ticketId,
  currentUserId,
  currentUserRol,
}: TicketChatDrawerProps) {
  const { can } = usePermissions();
  const [ticket, setTicket] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [archivoAdjunto, setArchivoAdjunto] = useState<File[]>([]);
  const [motivoReapertura, setMotivoReapertura] = useState("");
  const mensajesEndRef = useRef<HTMLDivElement>(null);
  // Estados existentes...
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Lógica de grabación de audio
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioFile = new File([audioBlob], "nota_de_voz.webm", { type: "audio/webm" });
          setArchivoAdjunto(prev => prev.length < 10 ? [...prev, audioFile] : prev);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert("Debes permitir el acceso al micrófono en tu navegador.");
      }
    }
  };

  // Lógica unificada para procesar archivos arrastrados o seleccionados
  const cargarTicket = async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/tickets?id=${ticketId}`);
      const data = await res.json();
      if (!res.ok) { setLoadError(data.error || "No se pudo abrir el ticket"); setTicket(null); return; }
      setLoadError(""); setTicket(data);
      setTimeout(
        () => mensajesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        200,
      );
    } catch (e) {
      console.error("Error al cargar ticket:", e);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      cargarTicket();
      const interval = setInterval(cargarTicket, 15000);
      return () => clearInterval(interval);
    } else {
      setTicket(null);
      setMensaje("");
      setArchivoAdjunto([]);
    }
  }, [isOpen, ticketId]);
  const enviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Si no hay texto Y TAMPOCO hay archivo, no hace nada.
    if (!mensaje.trim() && !archivoAdjunto.length) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("accion", "enviarMensaje");
      formData.append("ticketId", String(ticketId));
      
      // 🔥 ESTO ES LO NUEVO: Generar un texto automático si está vacío 🔥
      const textoFinal = mensaje.trim() 
        ? mensaje 
        : (archivoAdjunto[0]?.type.startsWith("audio/") ? "🎵 Nota de voz" : "📎 Archivo adjunto");
        
      formData.append("contenido", textoFinal);
      
      archivoAdjunto.forEach(file => formData.append("file", file));

      const res = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMensaje("");
        setArchivoAdjunto([]);
        await cargarTicket();
      } else {
        alert("Error del servidor. Revisa si el formato de archivo está permitido.");
      }
    } catch (error) {
      alert("Error al enviar mensaje.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (nuevoEstado === "Re-Abierto" && !motivoReapertura.trim()) {
      return alert("Debes escribir el motivo de la reapertura.");
    }

    setLoading(true);
    try {
      await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, nuevoEstado, motivoReapertura }),
      });
      setMotivoReapertura("");
      await cargarTicket();
    } catch (error) {
      alert("Error al cambiar estado.");
    } finally {
      setLoading(false);
    }
  };
  const borrarArchivo = async (mensajeId: number) => {
    if (
      !confirm(
        "¿Estás seguro de borrar este archivo? Se eliminará del servidor para ahorrar espacio, pero el texto se mantendrá.",
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?mensajeId=${mensajeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await cargarTicket();
      } else {
        alert("No se pudo borrar el archivo.");
      }
    } catch (error) {
      alert("Error de conexión al intentar borrar.");
    } finally {
      setLoading(false);
    }
  };

  const getColorEstado = (est: string) => {
    switch (est) {
      case "Abierto":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "En Proceso":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pendiente":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Resuelto":
        return "bg-cyan-100 text-cyan-800 border-cyan-300 animate-pulse"; // 🔥 NUEVO ESTADO DE ESPERA
      case "Cerrado":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Re-Abierto":
        return "bg-red-100 text-red-800 border-red-200";
      case "Vencido":
        return "bg-rose-100 text-rose-800 border-rose-300 animate-pulse";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-gray-50 w-full md:w-450px h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* HEADER */}
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-sm text-gray-900">
                {ticket?.codigo || "Cargando..."}
              </span>
              {ticket && (
                <Badge
                  className={`text-[10px] ${getColorEstado(ticket.estado)}`}
                >
                  {ticket.estado}
                </Badge>
              )}
            </div>
            <p className="text-xs font-bold text-gray-500 line-clamp-1">
              {ticket?.asunto}
            </p>
          </div>
          <button type="button" className="mr-2 inline-flex items-center gap-1 text-xs text-blue-700" onClick={() => { if (window.location.pathname === "/tickets") onClose(); else window.location.assign("/tickets"); }}><ArrowLeft size={14} /> Volver al listado</button>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
          {!ticket ? (
            <div className="text-center text-gray-400 text-xs mt-10 animate-pulse font-bold">
              Cargando hilo de conversación...
            </div>
          ) : (
            ticket.mensajes?.map((msg: any, idx: number) => {
              if (msg.esSistema && !msg.adjuntoUrl) {
                return (
                  <div key={idx} className="flex justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-[10px] font-bold px-4 py-1.5 rounded-full border border-gray-300 shadow-inner flex items-center gap-2">
                      <AlertCircle size={12} className="text-gray-500" />
                      {msg.contenido}
                    </div>
                  </div>
                );
              }

              const isMe = msg.remitenteId === currentUserId;
              const isImage =
                msg.adjuntoTipo === "imagen" ||
                msg.adjuntoTipo?.includes("image");

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-4`}
                >
                  <div
                    className={`text-[9px] font-bold text-gray-400 mb-1 px-1 flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <span>
                      {msg.remitente?.nombre || "Sistema"} (
                      {msg.remitente?.rol || "Auto"})
                    </span>
                    <span>
                      {new Date(msg.createdAt).toLocaleString("es-EC", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm ${isMe ? "bg-primary text-white rounded-tr-none" : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"}`}
                  >
                    <p className="whitespace-pre-wrap">{msg.contenido}</p>
                    {msg.adjuntoUrl && (
                      <div className="mt-2 border-t border-white/20 pt-2 relative group">
                        {msg.adjuntoTipo?.includes("audio") ? (
                          <audio controls src={msg.adjuntoUrl} className="max-w-full h-10" />
                        ) : isImage ? (
                          <div className="relative inline-block">
                            <a
                              href={msg.adjuntoUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver en pantalla completa"
                            >
                              <img
                                src={msg.adjuntoUrl}
                                alt="adjunto"
                                className="rounded-lg max-h-48 object-cover border border-black/10 cursor-zoom-in hover:opacity-90 transition-opacity"
                              />
                            </a>
                            <div className="absolute -top-3 -right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={msg.adjuntoUrl}
                                download={
                                  msg.adjuntoNombre || "imagen_descargada.jpg"
                                }
                                className="bg-blue-500 text-white p-1.5 rounded-full shadow-md hover:bg-blue-600 transition-colors"
                                title="Descargar a la computadora"
                              >
                                <Download size={14} />
                              </a>
                              {can("tickets:eliminar_adjunto") && (
                                <button
                                  onClick={() => borrarArchivo(msg.id)}
                                  className="bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                  title="Borrar del Servidor"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="relative inline-block w-full">
                            <a
                              href={msg.adjuntoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold ${isMe ? "bg-white/20 text-white hover:bg-white/30" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                            >
                              <FileText size={16} />{" "}
                              {msg.adjuntoNombre || "Documento Adjunto"}
                            </a>

                            <div className="absolute -top-3 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={msg.adjuntoUrl}
                                download={msg.adjuntoNombre || "documento.pdf"}
                                className="bg-blue-500 text-white p-1.5 rounded-full shadow-md hover:bg-blue-600 transition-colors"
                                title="Descargar documento"
                              >
                                <Download size={12} />
                              </a>
                              {can("tickets:eliminar_adjunto") && (
                                <button
                                  onClick={() => borrarArchivo(msg.id)}
                                  className="bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                  title="Borrar del Servidor"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!msg.adjuntoUrl &&
                      msg.adjuntoNombre?.includes("eliminado") && (
                        <div className="mt-2 border-t border-white/20 pt-2 flex items-center gap-1">
                          <Trash2
                            size={12}
                            className={isMe ? "text-white/70" : "text-gray-400"}
                          />
                          <p
                            className={`text-[10px] italic font-medium ${isMe ? "text-white/70" : "text-gray-400"}`}
                          >
                            {msg.adjuntoNombre}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={mensajesEndRef} />
        </div>
        <div className="bg-white border-t border-gray-200 p-3 z-10">
          {ticket?.estado !== "Cerrado" && can("tickets:responder") ? (
            <form 
              onSubmit={enviarMensaje} 
              className="flex flex-wrap gap-2 items-end"
              onPaste={e => pegarArchivosTicket(e, archivoAdjunto, setArchivoAdjunto)}
            >
              <div className="w-full"><TicketAttachments archivos={archivoAdjunto} onChange={setArchivoAdjunto} disabled={loading || isRecording} /></div>
              <textarea
                className="flex-1 max-h-24 min-h-40px text-sm p-2 bg-gray-50 border border-gray-200 rounded-xl resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder={isRecording ? "Grabando audio... (Clic al cuadrado rojo para detener)" : "Escribe o arrastra una imagen/PDF..."}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                disabled={loading || isRecording}
              />

              {/* Botón Grabadora */}
              <Button
                type="button"
                onClick={toggleRecording}
                className={`rounded-full p-2 h-10 w-10 shrink-0 flex items-center justify-center shadow-md transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              >
                {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
              </Button>

              <Button
                type="submit"
                disabled={loading || isRecording || (!mensaje.trim() && !archivoAdjunto.length)}
                className="bg-primary hover:bg-primary/90 text-white rounded-full p-2 h-10 w-10 shrink-0 flex items-center justify-center shadow-md"
              >
                <Send size={18} className="ml-1" />
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <div className="bg-emerald-50 text-emerald-800 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 border border-emerald-200">
                <CheckCircle2 size={16} /> Este ticket fue cerrado y resuelto.
              </div>

              {can("tickets:reabrir") && (
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <Input
                    placeholder="Motivo de reapertura..."
                    className="text-xs h-8 bg-red-50 border-red-200 placeholder:text-red-300"
                    value={motivoReapertura}
                    onChange={(e) => setMotivoReapertura(e.target.value)}
                  />
                  <Allowed permission="tickets:reabrir"><Button
                    variant="outline"
                    size="sm"
                    onClick={() => cambiarEstado("Re-Abierto")}
                    disabled={loading}
                    className="w-full text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <RefreshCw size={14} className="mr-1" /> Forzar Reapertura
                    de Ticket
                  </Button></Allowed>
                </div>
              )}
            </div>
          )}

          {/* 🔥 1. BOTONES CUANDO EL TICKET ESTÁ ACTIVO 🔥 */}
          {ticket?.estado !== "Cerrado" && ticket?.estado !== "Resuelto" && (
            <div className="mt-3 flex justify-between gap-2 border-t border-gray-100 pt-3">
              <Allowed permission="tickets:resolver"><Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cambiarEstado("Pendiente")}
                className="flex-1 text-xs h-8 text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 font-bold shadow-sm"
              >
                Pausar a Pendiente
              </Button></Allowed>
              <Allowed permission="tickets:resolver"><Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cambiarEstado("Resuelto")}
                className="flex-1 text-xs h-8 text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100 font-bold shadow-sm"
              >
                <CheckCircle2 size={14} className="mr-1" /> Notificar Solución
              </Button></Allowed>
            </div>
          )}

          {/* 2. FLUJO DE APROBACIÓN CUANDO ESTÁ "RESUELTO */}
          {ticket?.estado === "Resuelto" && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              {ticket.creadorId === currentUserId ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs p-2.5 rounded-lg text-center font-bold shadow-inner">
                    El equipo ha marcado este ticket como resuelto. ¿Estás
                    conforme con el resultado?
                  </div>

                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="Escribe aquí qué falta (Obligatorio solo si rechazas)..."
                      className="text-xs h-9 bg-white border-gray-300 focus:border-red-400"
                      value={motivoReapertura}
                      onChange={(e) => setMotivoReapertura(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Allowed permission="tickets:reabrir"><Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => cambiarEstado("Re-Abierto")}
                        className="flex-1 text-xs h-9 text-red-700 bg-red-50 border-red-200 hover:bg-red-100 font-bold shadow-sm"
                      >
                        👎 Faltan cosas (Re-abrir)
                      </Button></Allowed>
                      <Allowed permission="tickets:cerrar"><Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => cambiarEstado("Cerrado")}
                        className="flex-1 text-xs h-9 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold shadow-sm"
                      >
                        👍 Conforme (Cerrar)
                      </Button></Allowed>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 text-gray-500 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 border border-gray-200 shadow-inner">
                  <Clock size={16} className="animate-spin-slow" /> ⏳ Esperando que el creador apruebe la solución...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
