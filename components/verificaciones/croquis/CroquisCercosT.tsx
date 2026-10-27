/**
 * Corte de la T con sus dos cercos, como se arman: uno del alma, de toda la
 * altura, y otro del ala, del ancho del ala. Sirve para que quede claro cuál
 * toma el cortante (el del alma) y cuál cose la unión ala–alma (el del ala).
 */
export function CroquisCercosT({ invertida, conCercoAla }: { invertida: boolean; conCercoAla: boolean }) {
  // Proporciones fijas: es un croquis de qué es cada cerco, no un dibujo a escala.
  const ancho = 240, alma = 70, canto = 190, hf = 50, x0 = 50, y0 = 20;
  const xa = x0 + (ancho - alma) / 2;
  const yAla = invertida ? y0 + canto - hf : y0;
  const contorno = invertida
    ? `M${xa} ${y0} H${xa + alma} V${yAla} H${x0 + ancho} V${y0 + canto} H${x0} V${yAla} H${xa} Z`
    : `M${x0} ${y0} H${x0 + ancho} V${y0 + hf} H${xa + alma} V${y0 + canto} H${xa} V${y0 + hf} H${x0} Z`;
  const r = 8;
  return (
    <figure className="space-y-2">
      <svg viewBox="0 0 340 250" className="h-auto w-full max-w-[22rem]" fill="none" aria-hidden="true">
        <path d={contorno} fill="var(--mat-hormigon)" stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" />
        {conCercoAla && (
          <rect x={x0 + r} y={yAla + r} width={ancho - 2 * r} height={hf - 2 * r} rx="5" className="stroke-destructive" strokeWidth="2.5" />
        )}
        <rect x={xa + r} y={y0 + r} width={alma - 2 * r} height={canto - 2 * r} rx="5" className="stroke-exito" strokeWidth="2.5" />
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-exito" /> cerco del alma: toma el cortante
        </span>
        {conCercoAla && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 bg-destructive" /> cerco del ala: cose la unión ala–alma (rasante)
          </span>
        )}
      </figcaption>
    </figure>
  );
}
