"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }
      if (data.rol === 'super_admin' || data.rol === 'administrador') {
        router.push('/inicio');
      } else {
        router.push('/agenda'); 
      } 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img 
          src="/logo.png" 
          alt="Logo Araujos" 
          className="h-28 w-70 object-contain mb-2 drop-shadow-md" 
        />
        <h2 className="mt-1 text-center text-h1">
          Iniciar Sesión
        </h2>
        <p className="mt-1 text-center text-secondary">
          Sistema de Gestión Comercial
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-border">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-primary p-4 rounded-r-md">
              <p className="text-sm text-primary font-bold">{error}</p>
            </div>
          )}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="email" className="block text-sm font-bold text-foreground">Correo Electrónico</Label>
              <div className="mt-1">
                <Input 
                  id="email" 
                  type="email" 
                  required 
                  className="w-full h-11 bg-white" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@araujos.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-bold text-foreground">Contraseña</Label>
              <div className="mt-1 relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full h-11 pr-10 bg-white" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-base font-bold shadow-md transition-transform active:scale-[0.98]" disabled={loading}>
              {loading ? 'Verificando...' : 'Entrar al sistema'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}