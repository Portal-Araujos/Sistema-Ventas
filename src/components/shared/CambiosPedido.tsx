"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TicketChatDrawer from "@/components/shared/TicketChatDrawer";
import TicketAssignees from "@/components/shared/TicketAssignees";
import { usePermissions } from "@/components/shared/PermissionsProvider";
import TicketAttachments, { pegarArchivosTicket } from "@/components/shared/TicketAttachments";
import PrendaCombobox from "@/components/shared/PrendaCombobox";
import { ArrowLeftRight } from "lucide-react";

type Ticket = { id: number; codigo: string; estado: string; cantidadCambio: number | null };
type Prenda = { id: string; pedidoId: string; skuCodigo: string; tipoRopa: string; talla: string; color: string; cantidad: number; estadoOperacion: string; estadoProduccion: string; guiaDespachoId: string | null; recibidoPorVendedor: boolean; ticketsCambio: Ticket[]; cambiosProduccion: { id: string; motivo: string; usuarioNombre: string; createdAt: string; anterior: { skuCodigo: string }; nuevo: { skuCodigo: string } }[] };
type Pedido = { id: string; numContrato: string; nombreCliente: string; detalles: Prenda[] };
type Opciones = { detalles: Prenda[]; usuarios: { id: string; nombre: string }[]; departamentos: { id: number; nombre: string }[]; skus: { codigo: string; tipoRopa: string; color: string; talla: string; genero: string }[]; puedeModificar: boolean };
type Props = { pedidos: Pedido[]; institucionId: string; currentUser: { id: string; rol: string }; onRefresh: () => Promise<void>; detalleInicial?: string; etiqueta?: string; soloProduccion?: boolean };

export default function CambiosPedido({ pedidos, institucionId, currentUser, onRefresh, detalleInicial, etiqueta, soloProduccion = false }: Props) {
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [pedidoId, setPedidoId] = useState("");
  const [opciones, setOpciones] = useState<Opciones | null>(null);
  const [detalleId, setDetalleId] = useState("");
  const [modo, setModo] = useState<"ticket" | "produccion" | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [file, setFile] = useState<File[]>([]);
  const [form, setForm] = useState({ motivo: "", solicitado: "", cantidad: 1, tipo: "", prioridad: "Media", asunto: "", mensaje: "", fechaLimite: "", asignados: [] as string[], sku: "" });
  const prenda = opciones?.detalles.find(d => d.id === detalleId);
  const activos = pedidos.flatMap(p => p.detalles || []).flatMap(d => d.ticketsCambio || []).filter(t => t.estado !== "Cerrado");
  const historial = pedidos.flatMap(p => p.detalles || []).flatMap(d => d.ticketsCambio || []);

  async function cargar(id: string) {
    setBusy(true); setError(""); setOpciones(null); setModo(null); setPedidoId(id);
    try {
      const res = await fetch(`/api/pedidos/cambios?pedidoId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpciones(data);
      if (soloProduccion && detalleInicial && data.puedeModificar) {
        const seleccionada = data.detalles.find((d: Prenda) => d.id === detalleInicial);
        if (seleccionada) seleccionar(seleccionada, "produccion");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el pedido"); }
    finally { setBusy(false); }
  }

  async function abrir() {
    if (!soloProduccion && etiqueta && activos.length === 1) { window.location.assign(`/tickets?ticketId=${activos[0].id}`); return; }
    setAviso(""); setOpen(true);
    const pedido = pedidos.find(p => p.detalles.some(d => d.id === detalleInicial)) || pedidos[0];
    if (pedido) await cargar(pedido.id);
  }

  function seleccionar(d: Prenda, tipo: "ticket" | "produccion") {
    setDetalleId(d.id); setModo(tipo); setError(""); setAviso(""); setFile([]);
    setForm({ motivo: "", solicitado: "", cantidad: 1, tipo: "", prioridad: "Media", asunto: `Cambio de prenda · ${d.skuCodigo} · Contrato ${pedidos.find(p => p.id === d.pedidoId)?.numContrato}`, mensaje: "", fechaLimite: "", asignados: [], sku: "" });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); if (!prenda || busy) return;
    if (modo === "produccion" && !form.sku) { setError("Selecciona una nueva prenda de la lista"); return; }
    setBusy(true); setError("");
    try {
      let res: Response;
      if (modo === "produccion") {
        res = await fetch("/api/pedidos/cambios", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ detallePedidoId: prenda.id, skuCodigo: form.sku, motivo: form.motivo }) });
      } else {
        const data = new FormData();
        Object.entries({ accion: "crearTicket", pedidoId, detallePedidoId: prenda.id, institucionId, motivoCambio: form.motivo, cambioSolicitado: form.solicitado, cantidadCambio: String(form.cantidad), tipo: form.tipo, prioridad: form.prioridad, asunto: form.asunto, fechaLimite: form.fechaLimite, asignadosIds: JSON.stringify(form.asignados), mensajeInicial: `Pedido: ${pedidoId}\nContrato: ${pedidos.find(p => p.id === pedidoId)?.numContrato}\nPrenda original: ${prenda.skuCodigo} · ${prenda.tipoRopa} · ${prenda.color} · ${prenda.talla}\nUnidades a cambiar: ${form.cantidad}\nMotivo: ${form.motivo}\nCambio solicitado: ${form.solicitado}\n\n${form.mensaje}` }).forEach(([key, value]) => data.append(key, value));
        file.forEach(adjunto => data.append("file", adjunto));
        res = await fetch("/api/tickets", { method: "POST", body: data });
      }
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      await cargar(pedidoId); setModo(null); await onRefresh();
      setAviso(modo === "produccion" ? "Prenda actualizada. El motivo y los valores anteriores quedaron en el historial." : `Solicitud ${data.ticket.codigo} creada y vinculada a la prenda.`);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  }

  function abrirTicket(id: number) { window.location.assign(`/tickets?ticketId=${id}`); }
  const inputClass = "w-full rounded-md border border-gray-300 bg-white p-2 text-sm";
  if (soloProduccion && !can("produccion:cambiar_prenda") && !can("pedidos:cambiar_produccion")) return null;
  return <>
    <Button size={soloProduccion ? "icon" : "sm"} variant="outline" className={soloProduccion ? "h-7 w-7 text-blue-700" : undefined} onClick={abrir} title={soloProduccion ? "Cambiar prenda" : "Cambios de prendas y tickets del pedido"} aria-label={soloProduccion ? "Cambiar prenda" : undefined}>
      {soloProduccion ? <ArrowLeftRight size={14} /> : etiqueta || (detalleInicial ? "Cambios / Ticket" : activos.length ? `${activos.length} ticket(s) activo(s)` : historial.length ? `Historial (${historial.length})` : "Solicitar cambio")}
    </Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader><DialogTitle>Cambios de prendas</DialogTitle></DialogHeader>
        <label className="text-sm font-semibold">Pedido / contrato
          <select className={inputClass} value={pedidoId} disabled={busy} onChange={e => cargar(e.target.value)}>
            {pedidos.map(p => <option key={p.id} value={p.id}>Contrato {p.numContrato} · {p.nombreCliente}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {aviso && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">{aviso}</p>}
        {busy && <p role="status">Procesando…</p>}
        {!modo && opciones?.detalles.filter(d => !soloProduccion || d.id === detalleInicial).map(d => {
          const activo = d.ticketsCambio.find(t => t.estado !== "Cerrado");
          const editable = opciones.puedeModificar && d.estadoOperacion === "En produccion" && d.estadoProduccion !== "Terminado" && !d.guiaDespachoId && !d.recibidoPorVendedor;
          return <div key={d.id} className={`rounded-lg border p-3 space-y-2 ${activo ? "border-amber-400 bg-amber-50" : d.id === detalleInicial ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
            <p className="font-semibold text-sm">{d.skuCodigo} · {d.tipoRopa} · {d.color} · {d.talla} · {d.cantidad} unidad(es)</p>
            <p className="text-xs text-gray-600">{d.recibidoPorVendedor ? "Recibida" : d.estadoOperacion}</p>
            {activo && <p className="text-sm font-semibold text-amber-800">Cambio solicitado · {activo.codigo} · {activo.cantidadCambio} unidad(es)</p>}
            <div className="flex gap-2 flex-wrap">
              {!soloProduccion && can("tickets:crear") && d.recibidoPorVendedor && d.guiaDespachoId && !activo && <Button disabled={busy} size="sm" onClick={() => seleccionar(d, "ticket")}>Solicitar cambio</Button>}
              {editable && <Button disabled={busy} size="sm" variant="outline" onClick={() => seleccionar(d, "produccion")}>Modificar en producción</Button>}
              {!soloProduccion && d.ticketsCambio.map(t => <Button key={t.id} size="sm" variant="outline" onClick={() => abrirTicket(t.id)}>{t.codigo} · {t.estado}</Button>)}
            </div>
            {d.cambiosProduccion.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-semibold">Historial de modificaciones ({d.cambiosProduccion.length})</summary>{d.cambiosProduccion.map(c => <p className="py-2 border-b" key={c.id}>{new Date(c.createdAt).toLocaleString("es-EC")} · {c.usuarioNombre}<br />{c.anterior.skuCodigo} → {c.nuevo.skuCodigo}<br />Motivo: {c.motivo}</p>)}</details>}
          </div>;
        })}
        {modo && prenda && <form onSubmit={guardar} className="space-y-3" onPaste={e => { if (modo === "ticket") pegarArchivosTicket(e, file, setFile); }}>
          <p className="rounded bg-blue-50 p-3 text-sm font-semibold">{modo === "produccion" ? "Modificar en producción" : "Solicitud de cambio"}: {prenda.skuCodigo} · {prenda.tipoRopa} · {prenda.color} · Talla {prenda.talla}</p>
          {modo === "produccion" ? <>
            <p className="text-xs text-gray-600">Se actualizarán las {prenda.cantidad} unidad(es) de esta fila. La cantidad y el estado se conservan.</p>
            <PrendaCombobox skus={opciones?.skus || []} value={form.sku} onChange={sku => setForm({ ...form, sku })} disabled={busy} />
          </> : <>
            <label className="block text-sm">Cantidad a cambiar *<input required type="number" min={1} max={prenda.cantidad} className={inputClass} value={form.cantidad} onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })} /></label>
            <label className="block text-sm">Cambio solicitado *<input required className={inputClass} value={form.solicitado} onChange={e => setForm({ ...form, solicitado: e.target.value })} placeholder="Ej.: cambiar talla M por L, mismo color" /></label>
            <label className="block text-sm">Área responsable *<select required className={inputClass} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="">Seleccionar</option>{opciones?.departamentos.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}</select></label>
            <div className="space-y-2 text-sm"><p>Asignados (opcional, selección múltiple)</p><TicketAssignees usuarios={opciones?.usuarios || []} value={form.asignados} onChange={asignados => setForm({ ...form, asignados })} disabled={busy} /></div>
            <label className="block text-sm">Prioridad<select className={inputClass} value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>{["Baja", "Media", "Alta", "Urgente"].map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="block text-sm">Asunto *<input required className={inputClass} value={form.asunto} onChange={e => setForm({ ...form, asunto: e.target.value })} /></label>
            <label className="block text-sm">Fecha límite *<input required type="date" className={inputClass} value={form.fechaLimite} onChange={e => setForm({ ...form, fechaLimite: e.target.value })} /></label>
            <label className="block text-sm">Descripción *<textarea required className={inputClass} value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} /></label>
            <TicketAttachments archivos={file} onChange={setFile} disabled={busy} />
          </>}
          <label className="block text-sm">Motivo del cambio *<textarea required minLength={10} className={inputClass} value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} placeholder="Explica el motivo (mínimo 10 caracteres)" /></label>
          <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setModo(null)}>Volver</Button><Button disabled={busy} type="submit">{busy ? "Guardando…" : modo === "produccion" ? "Guardar modificación" : "Crear ticket de cambio"}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
    <TicketChatDrawer isOpen={ticketId !== null} ticketId={ticketId} currentUserId={currentUser.id} currentUserRol={currentUser.rol} onClose={() => { setTicketId(null); void onRefresh(); }} />
  </>;
}
