"use client";

import React, { useState, useEffect } from 'react';
import { User, Plus, Edit3, ShieldAlert, KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [rolesDinamicos, setRolesDinamicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulario unificado para Crear y Editar
  const initialForm = { id: '', nombre: '', email: '', password: '', rolId: '', activo: true };
  const [formUser, setFormUser] = useState(initialForm);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargamos usuarios y roles al mismo tiempo
      const [resUsers, resRoles] = await Promise.all([
        fetch('/api/usuarios'),
        fetch('/api/roles') // Llama a la API que creamos en el paso anterior
      ]);
      setUsuarios(await resUsers.json());
      setRolesDinamicos(await resRoles.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleOpenEdit = (user: any) => {
    setFormUser({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      password: '', // Se deja vacío para no cambiarla a menos que el admin escriba algo
      rolId: user.rolId.toString(),
      activo: user.activo
    });
    setModalOpen(true);
  };

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEditing = !!formUser.id;
      const method = isEditing ? 'PUT' : 'POST';

      // Si estamos creando, la clave es obligatoria. Si estamos editando, solo se manda si escribió una nueva.
      const payload: any = { ...formUser };
      if (isEditing && !payload.password) delete payload.password; 

      const res = await fetch('/api/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      setModalOpen(false);
      cargarDatos();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6  min-h-screen">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="text-primary" /> Gestión de Personal
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Controla accesos, contraseñas y asigna roles dinámicos a tu equipo.</p>
        </div>
        <Button onClick={() => { setFormUser(initialForm); setModalOpen(true); }} className="bg-primary text-white font-bold">
          <Plus size={18} className="mr-1" /> Nuevo Usuario
        </Button>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Nombre / Email</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Rol Asignado</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Estado</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando personal...</TableCell></TableRow> : 
              usuarios.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-sm">{u.nombre}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`uppercase text-[10px] ${u.rolNombre === 'super admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {u.rolNombre}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {u.activo ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200"><CheckCircle2 size={12} className="mr-1"/> Activo</Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-600 border-red-200"><XCircle size={12} className="mr-1"/> Suspendido</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {u.rolNombre !== 'super admin' ? (
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)} className="text-primary h-8 border-primary/30">
                        <Edit3 size={14} className="mr-1" /> Editar
                      </Button>
                    ) : (
                      <div title="El Super Admin no se edita desde aquí" className="flex justify-center"><ShieldAlert size={18} className="text-gray-300" /></div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>

      {/* MODAL CREAR / EDITAR USUARIO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="text-primary" /> {formUser.id ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGuardarUsuario} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold">Nombre Completo *</Label>
              <Input required placeholder="Ej. Juan Pérez" value={formUser.nombre} onChange={e => setFormUser({ ...formUser, nombre: e.target.value })} />
            </div>

            <div>
              <Label className="text-xs font-semibold">Correo Electrónico *</Label>
              <Input required type="email" placeholder="juan@empresa.com" value={formUser.email} onChange={e => setFormUser({ ...formUser, email: e.target.value })} />
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <Label className="text-xs font-semibold flex items-center gap-1 text-amber-800"><KeyRound size={12}/> Contraseña</Label>
              <Input 
                required={!formUser.id} // Solo obligatoria si es nuevo
                type="password" 
                placeholder={formUser.id ? 'Escribe solo si quieres cambiarla...' : 'Contraseña segura...'} 
                value={formUser.password} 
                onChange={e => setFormUser({ ...formUser, password: e.target.value })} 
                className="mt-1 bg-white"
              />
            </div>

            {/* 🔥 EL SELECTOR DINÁMICO DE ROLES 🔥 */}
            <div>
              <Label className="text-xs font-semibold">Asignar Rol *</Label>
              <select 
                required 
                className="w-full h-10 border rounded-md px-2 text-sm bg-white" 
                value={formUser.rolId} 
                onChange={e => setFormUser({ ...formUser, rolId: e.target.value })}
              >
                <option value="">Seleccione un rol...</option>
                {rolesDinamicos.map(r => (
                  // Ocultamos super_admin del select para no crear clones
                  r.nombre !== 'super_admin' && <option key={r.id} value={r.id} className="uppercase">{r.nombre.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* MOSTRAR ESTADO SOLO SI ESTAMOS EDITANDO */}
            {formUser.id && (
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                <Label className="text-xs font-bold text-gray-700">Estado de la cuenta:</Label>
                <select className="h-8 border rounded-md px-2 text-xs bg-white font-semibold text-gray-700" value={formUser.activo ? 'true' : 'false'} onChange={e => setFormUser({ ...formUser, activo: e.target.value === 'true' })}>
                  <option value="true">🟢 Cuenta Activa</option>
                  <option value="false">🔴 Cuenta Suspendida</option>
                </select>
              </div>
            )}

            <DialogFooter className="pt-4 flex gap-2 justify-end">
              <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary text-white font-bold">
                {saving ? 'Guardando...' : formUser.id ? 'Actualizar Usuario' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}