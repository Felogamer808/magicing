import { IndiceVerificaciones } from "@/components/IndiceVerificaciones";
import { TemaToggle } from "@/components/TemaToggle";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-5 w-5 items-center justify-center border border-primary font-mono text-[11px] text-primary">
            §
          </span>
          MagicIng
        </div>
        <TemaToggle />
      </div>

      <div className="drafting-marks flex flex-col gap-8 border border-border bg-card/60 px-6 py-8 sm:px-10 sm:py-10">
        <div className="space-y-3">
          <p className="spec-label">EC2 · CIRSOC 201 · Cálculo estructural</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Verificaciones estructurales
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Elegí una verificación del índice para calcular. Cada una indica la norma
            aplicada y muestra el detalle de fórmulas para poder auditar el resultado.
          </p>
        </div>

        <svg
          viewBox="0 0 600 130"
          className="h-auto w-full max-w-xl text-primary"
          fill="none"
          aria-hidden="true"
        >
          {/* carga distribuida */}
          <g stroke="currentColor" strokeWidth="1.5" opacity="0.8">
            <path d="M40 10 L560 10" />
            {Array.from({ length: 15 }).map((_, i) => {
              const x = 40 + i * 37.14;
              return <path key={x} d={`M${x} 10 L${x} 32`} markerEnd="url(#arrow)" />;
            })}
          </g>

          {/* viga */}
          <path d="M40 46 L560 46" stroke="currentColor" strokeWidth="3" />

          {/* apoyo articulado */}
          <path d="M40 46 L26 70 L54 70 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M20 70 L60 70" stroke="currentColor" strokeWidth="1.5" />
          <g stroke="currentColor" strokeWidth="1" opacity="0.6">
            <path d="M22 70 L16 76 M32 70 L26 76 M42 70 L36 76 M52 70 L46 76" />
          </g>

          {/* apoyo móvil */}
          <circle cx="560" cy="58" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M540 70 L580 70" stroke="currentColor" strokeWidth="1.5" />
          <g stroke="currentColor" strokeWidth="1" opacity="0.6">
            <path d="M542 70 L536 76 M552 70 L546 76 M562 70 L556 76 M572 70 L566 76" />
          </g>

          {/* curva de momento */}
          <path
            d="M40 96 Q300 132 560 96"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.6"
          />

          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
              <path d="M0 0 L3 5 L6 0" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </marker>
          </defs>
        </svg>
      </div>

      <IndiceVerificaciones />
    </main>
  );
}
