import { BarraMovil } from "@/components/verificaciones/comun/BarraMovil";
import { BarraProyecto } from "@/components/verificaciones/comun/BarraProyecto";
import { PieVerificacion } from "@/components/verificaciones/comun/PieVerificacion";

export default function VerificacionesLayout({ children }: LayoutProps<"/verificaciones">) {
  return (
    <div className="flex flex-1 flex-col">
      <BarraMovil />

      {/*
        El pie va acá y no en cada página: son 42 y un aviso que hay que
        acordarse de poner es un aviso que alguna no tiene. Además se imprime,
        que es donde más falta hace.
      */}
      <div className="esquemas-acotados flex min-w-0 flex-1 flex-col">
        {/*
          La barra de proyecto va arriba de la página y no dentro de cada una,
          por el mismo motivo que el pie: son 41 verificaciones. Se dibuja sola
          sólo cuando hay un proyecto activo, así que quien entra a hacer una
          cuenta suelta no ve nada de esto.
        */}
        <div className="mx-auto w-full max-w-7xl px-6 pt-6 empty:hidden">
          <BarraProyecto />
        </div>
        <div className="flex-1">{children}</div>
        <PieVerificacion />
      </div>
    </div>
  );
}
