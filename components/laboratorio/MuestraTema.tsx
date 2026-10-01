"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { CroquisPosicionPilar } from "@/components/verificaciones/croquis/CroquisPunzonamiento";

/**
 * Una página de verificación en miniatura, con los componentes reales.
 *
 * No es una maqueta: son `Card`, `ResultadoCheck`, `CampoNumerico`,
 * `PanelFormulas` y un croquis de verdad, los mismos que usan las 45 páginas.
 * Por eso sirve para decidir: lo que se ve acá es literalmente lo que va a
 * quedar, no una interpretación de lo que quedaría.
 *
 * Se eligió punzonamiento como caso porque junta todo lo que el tema tiene que
 * resolver a la vez: un croquis SVG con bordes rayados y línea de cota, cifras
 * en monoespaciada, dos estados opuestos de verificación y un panel plegado.
 */
export function MuestraTema() {
  const [c1, setC1] = useState("0,30");
  const [phi, setPhi] = useState("12");

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <p className="spec-label">Losas</p>
        <h1 className="text-2xl font-semibold tracking-tight">Punzonamiento</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Posición del pilar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CroquisPosicionPilar posicion="borde" />
          <div className="grid grid-cols-2 gap-4">
            <CampoNumerico id="lab-c1" etiqueta="c1" sufijo="m" valor={c1} onChange={setC1} />
            <CampoDiametro id="lab-phi" etiqueta="Ø negativos" valor={phi} onChange={setPhi} />
          </div>
          <PanelAyuda titulo="Por qué importa dónde está el pilar">
            <p>
              El perímetro crítico rodea al pilar a 2d, pero contra un borde libre se corta: la
              parte que caería fuera de la losa no existe y el borde en sí no computa.
            </p>
          </PanelAyuda>
        </CardContent>
      </Card>

      <Card className="drafting-marks">
        <CardHeader>
          <CardTitle className="text-base">Comprobaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResultadoCheck
            etiqueta="Cara del pilar — biela comprimida"
            verifica
            comparacion={{
              real: { etiqueta: "vEd", valor: 1.51 },
              limite: { etiqueta: "vRd,max", valor: 4.22 },
              unidad: "MPa",
              exige: "≤",
            }}
          />
          <ResultadoCheck
            etiqueta="Perímetro crítico a 2d"
            verifica={false}
            comparacion={{
              real: { etiqueta: "vEd", valor: 0.74 },
              limite: { etiqueta: "vRd,c", valor: 0.58 },
              unidad: "MPa",
              exige: "≤",
            }}
            detalle="u1 325 cm · ρl 0,463 % · k 2,000"
          />
          <ResultadoCheck
            etiqueta="sr ≤ 0,75d"
            verifica
            detalle="12,0 ≤ 12,2 cm"
          />
          <PanelFormulas
            titulo="Ver cálculo"
            filas={[
              { etiqueta: "u1", valor: "325,0 cm" },
              {
                etiqueta: "k",
                valor: "2,000",
                formula: "mín(1 + √(200/d) ; 2)",
                sustitucion: "mín(1 + √(200/163) ; 2)",
              },
              {
                etiqueta: "vEd",
                valor: "0,742 MPa",
                formula: "β·VEd/(u1·d)",
                sustitucion: "1,40·90,0/(3,250·0,163)",
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
