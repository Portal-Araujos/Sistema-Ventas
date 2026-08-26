"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, FileText, CheckCircle2, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TicketChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number | null;
  currentUserId: string;
  currentUserRol: string; // Para saber si es super_admin
}

export default function TicketChatDrawer({ isOpen, onClose, ticketId, currentUserId, currentUserRol }: TicketChatDrawerProps) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [adjunto, setAdjunto] = useState<{ url: string; tipo: string; nombre: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  // Cargar los datos del ticket y el historial de chat
  const cargarTicket = async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/tickets?id=${ticketId}`);
      const data = await res.json();
      setTicket(data);
      // Auto-scroll al último mensaje
      setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (e) {
      console.error("Error al cargar ticket:", e);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      cargarTicket();
      // Refrescar automáticamente cada 15 segundos si el chat está abierto
      const interval = setInterval(cargarTicket, 15000);
      return () => clearInterval(interval);
    } else {
      setTicket(null);
      setMensaje('');
      setAdjunto(null);
    }
  }, [isOpen, ticketId]);

  // 🔥 ALGORITMO ANTI-SATURACIÓN: Compresión de Imágenes a WebP 🔥
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Si es PDF, solo verificamos el peso (Máximo 2MB)
    if (file.type === 'application/pdf') {
      if (file.size > 2 * 1024 * 1024) return alert("El PDF es muy pesado. Máximo 2MB.");
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => setAdjunto({ url: reader.result as string, tipo: 'pdf', nombre: file.name });
      return;
    }

    // Si es Imagen, la comprimimos con HTML5 Canvas
    if (file.type.startsWith('image/')) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; // Resolución máxima
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convertimos a WebP con 70% de calidad (Súper ligero)
          const compressedBase64 = canvas.toDataURL('image/webp', 0.7);
          setAdjunto({ url: compressedBase64, tipo: 'imagen', nombre: file.name.replace(/\.[^/.]+$/, "") + ".webp" });
          setIsCompressing(false);
        };
      };
    }
  };

  const enviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mensaje.trim() && !adjunto) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'enviarMensaje',
          ticketId,
          contenido: mensaje,
          adjuntoUrl: adjunto?.url,
          adjuntoTipo: adjunto?.tipo,
          adjuntoNombre: adjunto?.nombre
        })
      });
      if (res.ok) {
        setMensaje('');
        setAdjunto(null);
        await cargarTicket();
      }
    } catch (error) {
      alert("Error al enviar mensaje.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (nuevoEstado === 'Re-Abierto' && !motivoReapertura.trim()) {
      return alert("Debes escribir el motivo de la reapertura.");
    }

    setLoading(true);
    try {
      await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, nuevoEstado, motivoReapertura })
      });
      setMotivoReapertura('');
      await cargarTicket();
    } catch (error) {
      alert("Error al cambiar estado.");
    } finally {
      setLoading(false);
    }
  };

  // Renderizados dinámicos de color
  const getColorEstado = (est: string) => {
    switch (est) {
      case 'Abierto': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'En Proceso': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pendiente': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Cerrado': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Re-Abierto': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      {/* Contenedor del Drawer (100% en celular, 450px en PC) */}
      <div className="bg-gray-50 w-full md:w-450px h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-sm text-gray-900">{ticket?.codigo || 'Cargando...'}</span>
              {ticket && <Badge className={`text-[10px] ${getColorEstado(ticket.estado)}`}>{ticket.estado}</Badge>}
            </div>
            <p className="text-xs font-bold text-gray-500 line-clamp-1">{ticket?.asunto}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* BODY / CHAT AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!ticket ? (
            <div className="text-center text-gray-400 text-xs mt-10 animate-pulse font-bold">Cargando hilo de conversación...</div>
          ) : (
            ticket.mensajes?.map((msg: any, idx: number) => {
              // 1. BURBUJA DE SISTEMA (Auditoría)
              if (msg.esSistema) {
                return (
                  <div key={idx} className="flex justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-[10px] font-bold px-4 py-1.5 rounded-full border border-gray-300 shadow-inner flex items-center gap-2">
                      <AlertCircle size={12} className="text-gray-500"/>
                      {msg.contenido}
                    </div>
                  </div>
                );
              }

              // 2. BURBUJAS DE USUARIO
              const isMe = msg.remitenteId === currentUserId;
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4`}>
                  <div className={`text-[9px] font-bold text-gray-400 mb-1 px-1 flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span>{msg.remitente?.nombre} ({msg.remitente?.rol})</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.contenido}</p>
                    
                    {/* Renderizar Adjuntos si existen */}
                    {msg.adjuntoUrl && (
                      <div className="mt-2 border-t border-white/20 pt-2">
                        {msg.adjuntoTipo === 'imagen' ? (
                          <a href={msg.adjuntoUrl} target="_blank" rel="noreferrer">
                            <img src={msg.adjuntoUrl} alt="adjunto" className="rounded-lg max-h-48 object-cover border border-black/10 cursor-zoom-in hover:opacity-90 transition-opacity" />
                          </a>
                        ) : (
                          <a href={msg.adjuntoUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            <FileText size={16} /> {msg.adjuntoNombre}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={mensajesEndRef} />
        </div>

        {/* PREVIEW DE ADJUNTO (Antes de enviar) */}
        {adjunto && (
          <div className="bg-blue-50 border-t border-blue-200 p-2 px-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
              {adjunto.tipo === 'imagen' ? <ImageIcon size={14}/> : <FileText size={14}/>}
              <span className="truncate max-w-200px">{adjunto.nombre}</span>
            </div>
            <button onClick={() => setAdjunto(null)} className="text-red-500 hover:text-red-700"><X size={16}/></button>
          </div>
        )}

        {/* FOOTER / CONTROLES DE ACCIÓN */}
        <div className="bg-white border-t border-gray-200 p-3 z-10">
          
          {ticket?.estado !== 'Cerrado' ? (
            // CONTROLES PARA TICKET ABIERTO
            <form onSubmit={enviarMensaje} className="flex gap-2 items-end">
              <label className="cursor-pointer p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors shrink-0">
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                <Paperclip size={18} />
              </label>
              
              <textarea 
                className="flex-1 max-h-24 min-h-40px text-sm p-2 bg-gray-50 border border-gray-200 rounded-xl resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder={isCompressing ? "Comprimiendo imagen..." : "Escribe un mensaje..."}
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                disabled={isCompressing || loading}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
              />
              
              <Button type="submit" disabled={isCompressing || loading || (!mensaje.trim() && !adjunto)} className="bg-primary hover:bg-primary/90 text-white rounded-full p-2 h-10 w-10 shrink-0 flex items-center justify-center shadow-md">
                <Send size={18} className="ml-1" />
              </Button>
            </form>
          ) : (
            // CONTROLES PARA TICKET CERRADO
            <div className="text-center space-y-3">
              <div className="bg-emerald-50 text-emerald-800 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 border border-emerald-200">
                <CheckCircle2 size={16} /> Este ticket fue cerrado y resuelto.
              </div>
              
              {/* REAPERTURA SOLO PARA SUPER ADMIN */}
              {currentUserRol === 'super_admin' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <Input 
                    placeholder="Motivo de reapertura..." 
                    className="text-xs h-8 bg-red-50 border-red-200 placeholder:text-red-300"
                    value={motivoReapertura}
                    onChange={e => setMotivoReapertura(e.target.value)}
                  />
                  <Button variant="outline" size="sm" onClick={() => cambiarEstado('Re-Abierto')} disabled={loading} className="w-full text-xs font-bold text-red-600 border-red-200 hover:bg-red-50">
                    <RefreshCw size={14} className="mr-1"/> Forzar Reapertura de Ticket
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* BOTÓN PARA CERRAR EL TICKET (Solo si está abierto) */}
          {ticket?.estado !== 'Cerrado' && (
            <div className="mt-3 flex justify-between gap-2 border-t border-gray-100 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => cambiarEstado('Pendiente')} className="flex-1 text-xs h-8 text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 font-bold">
                Pausar a Pendiente
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => cambiarEstado('Cerrado')} className="flex-1 text-xs h-8 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold">
                <CheckCircle2 size={14} className="mr-1"/> Marcar Resuelto
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}