import Link from "next/link";
import { getApiSession } from "@/lib/api-auth";
import { PAGE_PERMISSIONS, can } from "@/lib/permissions";
export default async function SinAcceso() {
  const session = await getApiSession();
  const destino = Object.entries(PAGE_PERMISSIONS).find(([, permiso]) => can(session, permiso))?.[0];
  return <div className="mx-auto max-w-lg p-8"><h1 className="text-xl font-bold">No tienes acceso a esta sección</h1><p className="mt-3 text-gray-600">Tu rol no tiene el permiso necesario. Puedes solicitarlo al administrador.</p>{destino && <Link className="mt-5 inline-block text-blue-700 underline" href={destino}>Ir a un módulo disponible</Link>}<Link className="mt-5 ml-4 inline-block text-blue-700 underline" href="/login">Ir al inicio de sesión</Link></div>;
}
