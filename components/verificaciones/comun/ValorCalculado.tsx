interface ValorCalculadoProps {
  etiqueta: string;
  sufijo?: string;
  /** Lo que se muestra en lugar del campo; vacío si no se pudo calcular. */
  valor: string;
  /** Una línea debajo: de dónde sale el valor. */
  nota?: string;
}

/**
 * Lugar de un campo que no se carga porque lo fija el cálculo. Ocupa lo mismo
 * que un `CampoNumerico` para que la grilla no salte al cambiar de modo.
 */
export function ValorCalculado({ etiqueta, sufijo, valor, nota }: ValorCalculadoProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm leading-none font-medium">
        {etiqueta} {sufijo && <span className="text-muted-foreground">({sufijo})</span>}
      </p>
      <p className="flex h-8 items-center rounded-lg border border-dashed border-input bg-muted/40 px-2.5 text-sm tabular-nums">
        {valor || "—"}
      </p>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}
