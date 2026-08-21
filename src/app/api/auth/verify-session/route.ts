import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId, sessionId, ip, rol } = await request.json();

    // 1. REGLA ANTI-CLONACIÓN Y BLOQUEOS
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { tokenSesionActual: true, bloqueado: true }
    });

    // Si tú lo bloqueaste desde el panel mientras él estaba usando el sistema
    if (!user || user.bloqueado) {
       return NextResponse.json({ valid: false, reason: 'bloqueado' });
    }

    // Si alguien más inició sesión con su cuenta (la llave ya no coincide)
    if (user.tokenSesionActual !== sessionId) {
       return NextResponse.json({ valid: false, reason: 'concurrencia' });
    }

    // 2. FILTRO DE IP PARA OFICINISTAS
    // Excluimos a Super Admin y a los Vendedores (porque los vendedores usan GPS con datos móviles)
    if (rol !== 'super_admin' && rol !== 'vendedor') { 
       const config = await prisma.configuracionSeguridad.findUnique({ where: { id: 1 } });
       
       if (config && config.ipOficina && config.ipOficina.trim() !== '') {
         const rolesBloqueados = JSON.parse(config.rolesBloqueados || '[]');
         
         // Si el rol actual está marcado en tu lista de seguridad
         if (rolesBloqueados.includes(rol)) {
            // Y su IP no es la de la oficina... ¡Alerta Roja!
            if (ip !== config.ipOficina) {
               return NextResponse.json({ valid: false, reason: 'ip_invalida' });
            }
         }
       }
    }

    // Todo está en orden, puede pasar.
    return NextResponse.json({ valid: true });

  } catch (error) {
    console.error("Error en Verify Session:", error);
    // Si hay un error interno evitamos expulsar a toda la empresa por accidente
    return NextResponse.json({ valid: true }); 
  }
}