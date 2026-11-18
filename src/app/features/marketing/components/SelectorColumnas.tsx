"use client";

import { COLUMNAS_TABLA } from "@/lib/marketing";

type Props = {
  visibles: Set<string>;
  onChange: (columnas: Set<string>) => void;
};

export default function SelectorColumnas({ visibles, onChange }: Props) {
  const alternar = (columna: string) => {
    const siguiente = new Set(visibles);
    if (siguiente.has(columna)) siguiente.delete(columna);
    else siguiente.add(columna);
    onChange(siguiente);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-xs font-semibold text-gray-600">Columnas visibles</p>
      <div className="flex flex-wrap gap-3">
        {COLUMNAS_TABLA.map((columna) => (
          <label key={columna} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={visibles.has(columna)}
              onChange={() => alternar(columna)}
              className="h-4 w-4"
            />
            {columna}
          </label>
        ))}
      </div>
    </div>
  );
}
