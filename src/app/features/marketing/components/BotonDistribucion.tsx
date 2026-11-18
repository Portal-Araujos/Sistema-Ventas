"use client";

import { Button } from "@/components/ui/button";

type Props = {
  aplicada: boolean;
  onToggle: () => void;
};

export default function BotonDistribucion({ aplicada, onToggle }: Props) {
  return (
    <Button
      type="button"
      variant={aplicada ? "outline" : "default"}
      onClick={onToggle}
    >
      {aplicada
        ? "Deshacer distribución"
        : "Aplicar distribución de clientes con vendedores antiguos"}
    </Button>
  );
}
