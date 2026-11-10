"use client";
import { createContext, useContext } from "react";
import { can, type PermissionSession } from "@/lib/permissions";
const PermissionsContext = createContext<PermissionSession | null>(null);
export function PermissionsProvider({ session, children }: { session: PermissionSession | null; children: React.ReactNode }) {
  return <PermissionsContext.Provider value={session}>{children}</PermissionsContext.Provider>;
}
export function usePermissions() {
  const session = useContext(PermissionsContext);
  return { session, can: (permission: string) => can(session, permission) };
}
export function Allowed({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = usePermissions();
  return can(permission) ? children : null;
}
