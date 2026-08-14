"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { FranjaLosaDiagrama } from "@/components/verificaciones/hormigon/FranjaLosaDiagrama";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { calcularFranjaLosa } from "@/lib/calc/hormigon/losas/losa-fundacion";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisPosicionPilares,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "losa-fundacion")!;

export default function LosaFundacionPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [longitud, setLongitud] = useCampo("longitud", "9");
  const [anchoTributario, setAnchoTributario] = useCampo("anchoTributario", "3");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "200");

  const [pos1, setPos1] = useCampo("pos1", "1.5");
  const [Nk1, setNk1] = useCampo("Nk1", "200");
  const [pos2, setPos2] = useCampo("pos2", "4.5");
  const [Nk2, setNk2] = useCampo("Nk2", "200");
  const [pos3, setPos3] = useCampo("pos3", "7.5");
  const [Nk3, setNk3] = useCampo("Nk3", "200");

  const [diametroInferior, setDiametroInferior] = useCampo("diametroInferior", "16");
  const [separacionInferior, setSeparacionInferior] = useCampo("separacionInferior", "0.15");
  const [diametroSuperior, setDiametroSuperior] = useCampo("diametroSuperior", "12");
  const [separacionSuperior, setSeparacionSuperior] = useCampo("separacionSuperior", "0.15");
  const [numeroSecundario, setNumeroSecundario] = useCampo("numeroSecundario", "8");
  const [diametroSecundario, setDiametroSecundario] = useCampo("diametroSecundario", "10");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      longitud: aNumero(longitud),
      anchoTributario: aNumero(anchoTributario),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      pos1: aNumero(pos1),
      Nk1: aNumero(Nk1),
      pos2: aNumero(pos2),
      Nk2: aNumero(Nk2),
      pos3: aNumero(pos3),
      Nk3: aNumero(Nk3),
      diametroInferior: aNumero(diametroInferior),
      separacionInferior: aNumero(separacionInferior),
      diametroSuperior: aNumero(diametroSuperior),
      separacionSuperior: aNumero(separacionSuperior),
      numeroSecundario: aNumero(numeroSecundario),
      diametroSecundario: aNumero(diametroSecundario),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.longitud > 0 && v.anchoTributario > 0 && v.H > 0;
    const posicionesValidas = v.pos1 >= 0 && v.pos2 > v.pos1 && v.pos3 > v.pos2 && v.pos3 <= v.longitud;
    const cargasValidas = v.Nk1 > 0 && v.Nk2 > 0 && v.Nk3 > 0;
    const armadurasValidas =
      v.diametroInferior > 0 && v.separacionInferior > 0 && v.diametroSuperior > 0 && v.separacionSuperior > 0 &&
      v.numeroSecundario > 0 && v.diametroSecundario > 0;

    if (!todosValidos || !geometriaValida || !posicionesValidas || !cargasValidas || !armadurasValidas || v.sigmaAdmisible <= 0) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });

    const franja = calcularFranjaLosa(
      materiales,
      { longitudM: v.longitud, anchoTributarioM: v.anchoTributario, H: v.H, recubrimiento: v.recubrimiento },
      v.sigmaAdmisible,
      {
        columnas: [
          { posicionM: v.pos1, Nk: v.Nk1 },
          { posicionM: v.pos2, Nk: v.Nk2 },
          { posicionM: v.pos3, Nk: v.Nk3 },
        ],
        armadoInferior: { diametroMm: v.diametroInferior, separacionM: v.separacionInferior },
        armadoSuperior: { diametroMm: v.diametroSuperior, separacionM: v.separacionSuperior },
        armadoSecundario: { numero: v.numeroSecundario, diametroMm: v.diametroSecundario },
      }
    );

    return { franja };
  }, [
    fck, fyk, longitud, anchoTributario, H, recubrimiento, sigmaAdmisible,
    pos1, Nk1, pos2, Nk2, pos3, Nk3,
    diametroInferior, separacionInferior, diametroSuperior, separacionSuperior, numeroSecundario, diametroSecundario,
  ]);

  const diagrama = useMemo(() => {
    const v = { longitud: aNumero(longitud), H: aNumero(H), pos1: aNumero(pos1), pos2: aNumero(pos2), pos3: aNumero(pos3) };
    if (!Object.values(v).every((n) => Number.isFinite(n)) || v.longitud <= 0 || v.H <= 0) return null;
    return { longitudM: v.longitud, HM: v.H, posicionesColumnasM: [v.pos1, v.pos2, v.pos3] };
  }, [longitud, H, pos1, pos2, pos3]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Método de franjas: se verifica una línea de pilares como si fuera una viga sobre el terreno,
          usando el ancho tributario de esa franja (la distancia a las líneas de pilares vecinas). Para
          verificar toda la losa, repetí esto por cada línea de pilares, en las dos direcciones.
        </CardContent>
      </Card>

      {diagrama && (
        <Card className="drafting-marks">
          <CardHeader>
            <CardTitle className="text-base">Franja (elevación)</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-2">
            <FranjaLosaDiagrama {...diagrama} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materiales y suelo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="sigmaAdmisible" etiqueta="σ suelo adm." sufijo="kN/m²" valor={sigmaAdmisible} onChange={setSigmaAdmisible} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geometría de la franja</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <CroquisPosicionPilares cantidad={3} />
              </div>
              <CampoNumerico id="longitud" etiqueta="Longitud" sufijo="m" valor={longitud} onChange={setLongitud} />
              <CampoNumerico id="anchoTributario" etiqueta="Ancho tributario" sufijo="m" valor={anchoTributario} onChange={setAnchoTributario} />
              <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
              <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pilar 1</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <CampoNumerico id="pos1" etiqueta="Posición" sufijo="m" valor={pos1} onChange={setPos1} />
                <CampoNumerico id="Nk1" etiqueta="Nk" sufijo="kN" valor={Nk1} onChange={setNk1} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pilar 2</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <CampoNumerico id="pos2" etiqueta="Posición" sufijo="m" valor={pos2} onChange={setPos2} />
                <CampoNumerico id="Nk2" etiqueta="Nk" sufijo="kN" valor={Nk2} onChange={setNk2} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pilar 3</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <CampoNumerico id="pos3" etiqueta="Posición" sufijo="m" valor={pos3} onChange={setPos3} />
                <CampoNumerico id="Nk3" etiqueta="Nk" sufijo="kN" valor={Nk3} onChange={setNk3} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armado inferior</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="diametroInferior" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroInferior} onChange={setDiametroInferior} />
                <CampoNumerico id="separacionInferior" etiqueta="Separación" sufijo="m" valor={separacionInferior} onChange={setSeparacionInferior} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armado superior</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="diametroSuperior" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroSuperior} onChange={setDiametroSuperior} />
                <CampoNumerico id="separacionSuperior" etiqueta="Separación" sufijo="m" valor={separacionSuperior} onChange={setSeparacionSuperior} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Armadura de reparto</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="numeroSecundario" etiqueta="Nº barras/m" valor={numeroSecundario} onChange={setNumeroSecundario} />
              <CampoNumerico id="diametroSecundario" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroSecundario} onChange={setDiametroSecundario} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores numéricos válidos. Las posiciones de los pilares deben ser
                crecientes (pilar 1 &lt; pilar 2 &lt; pilar 3) y no superar la longitud.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verificación geotécnica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Tensión admisible del suelo"
                    verifica={resultado.franja.geotecnico.verificaTension}
                    detalle={`σ ${fmt(resultado.franja.geotecnico.sigmaKPa)} kN/m² / σ adm ${fmt(aNumero(sigmaAdmisible))} kN/m²`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.franja.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Excentricidad", valor: `${fmt(resultado.franja.excentricidadM, 3)} m` },
                      { etiqueta: "Núcleo central (±longitud/6)", valor: resultado.franja.dentroDelNucleo ? "Dentro" : "Fuera" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armado inferior (momento positivo)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.franja.inferior.verificaAs}
                    detalle={`As real ${fmt(resultado.franja.inferior.asRealCm2PorM)} cm²/m / As nec ${fmt(resultado.franja.inferior.asNecCm2PorM)} cm²/m`}
                  />
                  <p className="text-xs text-muted-foreground">
                    M = {fmt(resultado.franja.inferior.mKNm)} kN·m, en x = {fmt(resultado.franja.inferior.posicionM, 2)} m
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armado superior (momento negativo)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.franja.superior.verificaAs}
                    detalle={`As real ${fmt(resultado.franja.superior.asRealCm2PorM)} cm²/m / As nec ${fmt(resultado.franja.superior.asNecCm2PorM)} cm²/m`}
                  />
                  <p className="text-xs text-muted-foreground">
                    M = {fmt(resultado.franja.superior.mKNm)} kN·m, en x = {fmt(resultado.franja.superior.posicionM, 2)} m
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cortante y armadura de reparto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Cortante (EC2 6.2.2)"
                    verifica={resultado.franja.cortante.verificaCorte}
                    detalle={`Vd ${fmt(resultado.franja.cortante.vEdKN)} kN / VRd,c ${fmt(resultado.franja.cortante.vRdCKN)} kN`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura de reparto"
                    verifica={resultado.franja.secundario.verificaAs}
                    detalle={`As real ${fmt(resultado.franja.secundario.asRealCm2)} cm² / As nec ${fmt(resultado.franja.secundario.asNecCm2)} cm²`}
                  />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Este tipo no viene de tu planilla — es un método preliminar de mano (franjas tratadas
                como viga sobre el terreno), no un análisis de placa. No incluye punzonamiento. Revisar
                antes de usar en obra.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
