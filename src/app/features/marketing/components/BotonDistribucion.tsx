"use client";

import { Button } from "@/components/ui/button";

type Props = {
  aplicada: boolean;
  onToggle: () => void;
  deshabilitado?: boolean;
};

export default function BotonDistribucion({ aplicada, onToggle, deshabilitado = false }: Props) {
  return (
    <Button
      type="button"
      variant={aplicada ? "outline" : "default"}
      onClick={onToggle}
      disabled={deshabilitado}
    >
      {aplicada
        ? "Deshacer distribución"
        : "Aplicar distribución de clientes con vendedores antiguos"}
    </Button>
  );
}
