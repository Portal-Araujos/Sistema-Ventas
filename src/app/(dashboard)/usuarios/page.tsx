"use client";

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, CheckCircle2, XCircle, KeyRound, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nuevo Usuario
  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rolId: '3' }); // 3 = Vendedor
  const [saving, setSaving] = useState(false);

  // Modal Cambiar Clave
  const [passModal, setPassModal] = useState({ open: false, id: '', nombre: '' });
  const [newPassword, setNewPassword] = useState('');

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al crear');

      setCreateModal(false);
      setFormData({ nombre: '', email: '', password: '', rolId: '3' });
      cargarUsuarios();
    } catch (e: any) {
      alert(e.message || "Error al crear el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEstado = async (id: string, activoActual: boolean) => {
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activo: !activoActual })
      });
      if (!res.ok) throw new Error();
      cargarUsuarios();
    } catch (e) {
      alert("Error al cambiar estado.");
    }
  };

  const handleCambiarPassword = async () => {
    if (!newPassword) return;
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: passModal.id, password: newPassword })
      });
      if (!res.ok) throw new Error();
      alert("✅ Contraseña actualizada con exito.");
      setPassModal({ open: false, id: '', nombre: '' });
      setNewPassword('');
    } catch (e) {
      alert("Error al cambiar la contraseña.");
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-primary" /> Gestión de Personal y Usuarios
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Administra las cuentas de Vendedores y Administradores del sistema
          </p>
        </div>

        <Button onClick={() => setCreateModal(true)} className="bg-primary hover:bg-primary/90 text-white font-bold flex gap-2">
          <UserPlus size={18} /> Nuevo Usuario
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/70">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Usuario / Personal</TableHead>
              <TableHead className="font-semibold text-gray-700">Rol de Acceso</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Cartera Asignada</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Estado</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Cargando personal...</TableCell></TableRow>
            ) : usuarios.map(u => (
              <TableRow key={u.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{u.nombre}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px] font-bold">
                    <Shield size={12} className="mr-1" /> {u.rolNombre}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-xs font-bold text-gray-700">
                  {u.escuelasAsignadas} escuelas
                </TableCell>
                <TableCell className="text-center">
                  {u.activo ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs">Activo</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 border-none text-xs">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs border-gray-200"
                      onClick={() => toggleEstado(u.id, u.activo)}
                    >
                      {u.activo ? <XCircle size={14} className="mr-1 text-red-500" /> : <CheckCircle2 size={14} className="mr-1 text-emerald-500" />}
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                      onClick={() => setPassModal({ open: true, id: u.id, nombre: u.nombre })}
                      title="Cambiar Contraseña"
                    >
                      <KeyRound size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL CREAR USUARIO */}
      <Dialog open={createModal} onOpenChange={setCreateModal}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Registrar Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearUsuario} className="space-y-4 mt-3">
            <div>
              <Label className="text-xs font-semibold">Nombre Completo *</Label>
              <Input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej: Carlos Mendoza" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Correo Electrónico *</Label>
              <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="carlos@empresa.com" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Contraseña Inicial *</Label>
              <Input required type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Rol del Sistema *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={formData.rolId} onChange={e => setFormData({ ...formData, rolId: e.target.value })}>
                <option value="3">Vendedor</option>
                <option value="2">Administrador</option>
                <option value="1">Super Admin</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary text-white">
                <Save size={16} className="mr-1" /> {saving ? 'Guardando...' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL CAMBIAR CLAVE */}
      <Dialog open={passModal.open} onOpenChange={val => setPassModal({ ...passModal, open: val })}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Cambiar Contraseña: {passModal.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <Label className="text-xs font-semibold">Nueva Contraseña</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPassModal({ open: false, id: '', nombre: '' })}>Cancelar</Button>
            <Button className="bg-primary text-white" disabled={!newPassword} onClick={handleCambiarPassword}>Guardar Clave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}