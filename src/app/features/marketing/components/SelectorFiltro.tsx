"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  FILTRO_TODOS,
  normalizarTexto,
  type OpcionFiltro,
} from "@/lib/marketing";

type Props = {
  etiqueta: string;
  valor: string;
  opciones: OpcionFiltro[];
  onChange: (valor: string) => void;
  permitirTodos?: boolean;
};

type ListaOpcionesProps = Props & {
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  idLista: string;
};

const CLASE_BOTON =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-800 hover:border-blue-300 focus-visible:border-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function ListaOpciones({
  etiqueta,
  valor,
  opciones,
  onChange,
  permitirTodos = true,
  busqueda,
  onBusquedaChange,
  idLista,
}: ListaOpcionesProps) {
  const [indice, setIndice] = useState(0);
  const opcionesRef = useRef<(HTMLButtonElement | null)[]>([]);

  const coincidencias = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    if (!texto) return opciones;
    return opciones.filter((opcion) =>
      normalizarTexto(opcion.etiqueta).includes(texto),
    );
  }, [opciones, busqueda]);

  const totalOpciones = coincidencias.length + (permitirTodos ? 1 : 0);
  const indiceSeguro =
    totalOpciones === 0 ? 0 : Math.min(indice, totalOpciones - 1);

  const enfocar = (siguiente: number) => {
    if (totalOpciones === 0) return;
    const normalizado = (siguiente + totalOpciones) % totalOpciones;
    setIndice(normalizado);
    const destino = permitirTodos
      ? normalizado === 0
        ? opcionesRef.current[-1]
        : opcionesRef.current[normalizado - 1]
      : opcionesRef.current[normalizado];
    destino?.focus();
  };

  const alNavegar = (evento: React.KeyboardEvent) => {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      enfocar(indiceSeguro + 1);
      return;
    }
    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      enfocar(indiceSeguro - 1);
      return;
    }
    if (evento.key === "Home") {
      evento.preventDefault();
      enfocar(0);
      return;
    }
    if (evento.key === "End") {
      evento.preventDefault();
      enfocar(totalOpciones - 1);
    }
  };

  const claseOpcion =
    "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500";

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <Input
        autoFocus
        value={busqueda}
        onChange={(evento) => {
          onBusquedaChange(evento.target.value);
          setIndice(0);
        }}
        onKeyDown={alNavegar}
        placeholder={`Buscar ${etiqueta.toLowerCase()}...`}
        aria-label={`Buscar opciones de ${etiqueta}`}
        aria-controls={idLista}
        className="h-11"
      />
      <div
        id={idLista}
        role="listbox"
        aria-label={`Opciones de ${etiqueta}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {permitirTodos && (
          <button
            ref={(nodo) => {
              opcionesRef.current[-1] = nodo;
            }}
            type="button"
            role="option"
            aria-selected={valor === FILTRO_TODOS}
            tabIndex={indiceSeguro === 0 ? 0 : -1}
            onClick={() => onChange(FILTRO_TODOS)}
            onKeyDown={alNavegar}
            className={claseOpcion}
          >
            <span>(Todos)</span>
            {valor === FILTRO_TODOS && (
              <Check size={16} aria-hidden="true" className="shrink-0 text-blue-600" />
            )}
          </button>
        )}
        {coincidencias.map((opcion, posicion) => (
          <button
            key={opcion.clave}
            ref={(nodo) => {
              opcionesRef.current[posicion] = nodo;
            }}
            type="button"
            role="option"
            aria-selected={valor === opcion.clave}
            tabIndex={indiceSeguro === posicion + (permitirTodos ? 1 : 0) ? 0 : -1}
            onClick={() => onChange(opcion.clave)}
            onKeyDown={alNavegar}
            className={claseOpcion}
          >
            <span className="truncate">{opcion.etiqueta}</span>
            {valor === opcion.clave && (
              <Check size={16} aria-hidden="true" className="shrink-0 text-blue-600" />
            )}
          </button>
        ))}
        {coincidencias.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-gray-500">
            Sin coincidencias
          </p>
        )}
      </div>
    </div>
  );
}

function textoSeleccion({
  valor,
  opciones,
  permitirTodos,
}: Pick<Props, "valor" | "opciones" | "permitirTodos">): string {
  if (valor === FILTRO_TODOS) {
    return permitirTodos ? "(Todos)" : "Selecciona…";
  }
  return (
    opciones.find((opcion) => opcion.clave === valor)?.etiqueta ??
    (permitirTodos ? "(Todos)" : "Selecciona…")
  );
}

function SelectorEscritorio({
  idLista,
  ...props
}: Props & { idLista: string }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const texto = textoSeleccion(props);

  const cambiarApertura = (siguiente: boolean) => {
    setAbierto(siguiente);
    if (!siguiente) setBusqueda("");
  };

  const elegir = (clave: string) => {
    props.onChange(clave);
    cambiarApertura(false);
  };

  return (
    <Popover open={abierto} onOpenChange={cambiarApertura}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-label={`${props.etiqueta}: ${texto}`}
          className={`${CLASE_BOTON} hidden sm:flex`}
        >
          <span className="truncate">{texto}</span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-gray-500 transition-transform ${abierto ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={8}
        avoidCollisions
        style={{ width: "var(--radix-popover-trigger-width)" }}
        className="max-h-[min(22rem,60dvh)] gap-0 overflow-hidden bg-white p-2 text-gray-900"
      >
        <ListaOpciones
          {...props}
          onChange={elegir}
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          idLista={idLista}
        />
      </PopoverContent>
    </Popover>
  );
}

function SelectorMovil({ idLista, ...props }: Props & { idLista: string }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const texto = textoSeleccion(props);

  const cambiarApertura = (siguiente: boolean) => {
    setAbierto(siguiente);
    if (!siguiente) setBusqueda("");
  };

  const elegir = (clave: string) => {
    props.onChange(clave);
    cambiarApertura(false);
  };

  return (
    <Sheet open={abierto} onOpenChange={cambiarApertura}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-label={`${props.etiqueta}: ${texto}`}
          className={`${CLASE_BOTON} sm:hidden`}
        >
          <span className="truncate">{texto}</span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-gray-500 transition-transform ${abierto ? "rotate-180" : ""}`}
          />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-gray-900"
      >
        <SheetHeader className="px-0 pt-0">
          <SheetTitle>Filtrar por {props.etiqueta}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <ListaOpciones
            {...props}
            onChange={elegir}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            idLista={idLista}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function SelectorFiltro(props: Props) {
  const idBase = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-gray-600">{props.etiqueta}</span>
      <SelectorEscritorio {...props} idLista={`${idBase}-escritorio`} />
      <SelectorMovil {...props} idLista={`${idBase}-movil`} />
    </div>
  );
}
