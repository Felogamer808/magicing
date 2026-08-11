"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { CroquisNervioSteelDeck } from "@/components/verificaciones/croquis/CroquisSteelDeck";
import { calcularSteelDeckFlexion, type ResistenciaFuego } from "@/lib/calc/ec4/steel-deck-flexion";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "steel-deck-flexion")!;

const RESISTENCIAS_FUEGO: readonly ResistenciaFuego[] = ["R60", "R90", "R120", "R180", "R240"];

export default function SteelDeckFlexionPage() {
  const [norma, setNorma] = useCampo("norma", "EC4");

  const [fypk, setFypk] = useCampo("fypk", "255.1");
  const [fck, setFck] = useCampo("fck", "25");
  const [fykBarras, setFykBarras] = useCampo("fykBarras", "500");

  const [espesorTotal, setEspesorTotal] = useCampo("espesorTotal", "0.15");
  const [alturaNervio, setAlturaNervio] = useCampo("alturaNervio", "0.063");
  const [ap, setAp] = useCampo("ap", "1620");
  const [dp, setDp] = useCampo("dp", "0.135");
  const [anchoNervio, setAnchoNervio] = useCampo("anchoNervio", "0.15");

  const [phiBarra, setPhiBarra] = useCampo("phiBarra", "10");
  const [sepBarra, setSepBarra] = useCampo("sepBarra", "200");
  const [recBarra, setRecBarra] = useCampo("recBarra", "0.025");

  const [mEd, setMEd] = useCampo("mEd", "20");

  const [resistenciaFuego, setResistenciaFuego] = useCampo<ResistenciaFuego>("resistenciaFuego", "R90");
  const [etaFi, setEtaFi] = useCampo("etaFi", "0.7");

  const resultado = useMemo(() => {
    const n = {
      fypk: aNumero(fypk), fck: aNumero(fck), fykBarras: aNumero(fykBarras),
      espesorTotal: aNumero(espesorTotal), alturaNervio: aNumero(alturaNervio),
      ap: aNumero(ap), dp: aNumero(dp), anchoNervio: aNumero(anchoNervio),
      phiBarra: aNumero(phiBarra), sepBarra: aNumero(sepBarra), recBarra: aNumero(recBarra),
      mEd: aNumero(mEd), etaFi: aNumero(etaFi),
    };
    const positivos = [n.fypk, n.fck, n.fykBarras, n.espesorTotal, n.alturaNervio, n.ap, n.dp,
                        n.anchoNervio, n.sepBarra, n.recBarra, n.etaFi];
    if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
    if (!Number.isFinite(n.phiBarra) || n.phiBarra < 0) return null;
    if (!Number.isFinite(n.mEd) || n.mEd < 0) return null;
    if (n.alturaNervio >= n.espesorTotal) return null;
    if (n.dp >= n.espesorTotal) return null;
    if (n.recBarra >= n.espesorTotal) return null;

    return {
      n,
      r: calcularSteelDeckFlexion(
        { fypkMPa: n.fypk, fckMPa: n.fck, fykBarrasMPa: n.fykBarras },
        {
          espesorTotalM: n.espesorTotal, alturaNervioM: n.alturaNervio, apMm2PorM: n.ap, dpM: n.dp,
          diametroBarraMm: n.phiBarra, separacionBarraMm: n.sepBarra, recubrimientoBarraM: n.recBarra,
          anchoNervioM: n.anchoNervio,
        },
        n.mEd,
        { resistenciaFuego, etaFi: n.etaFi }
      ),
    };
  }, [fypk, fck, fykBarras, espesorTotal, alturaNervio, ap, dp, anchoNervio,
      phiBarra, sepBarra, recBarra, mEd, resistenciaFuego, etaFi]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Steel deck</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Losa mixta con chapa colaborante (steel deck) y armadura adicional por nervio. En frío, la
          chapa y las barras se tratan como un único acero traccionado que equilibra el bloque de
          hormigón comprimido, EN 1994-1-1 §9.7.2. En incendio la chapa se descarta (es un perfil muy
          delgado, pierde su resistencia casi de inmediato) y sólo tracciona la armadura, reducida por
          temperatura según EC2-1-2. Todo por metro de losa.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Geometría del nervio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisNervioSteelDeck />
              </div>
              <CampoNumerico id="espesorTotal" etiqueta="h" sufijo="m" valor={espesorTotal} onChange={setEspesorTotal} />
              <CampoNumerico id="alturaNervio" etiqueta="hp" sufijo="m" valor={alturaNervio} onChange={setAlturaNervio} />
              <CampoNumerico id="anchoNervio" etiqueta="Ancho nervio" sufijo="m" valor={anchoNervio} onChange={setAnchoNervio} />
              <CampoNumerico id="dp" etiqueta="dp" sufijo="m" valor={dp} onChange={setDp} />
              <CampoNumerico id="ap" etiqueta="Ap chapa" sufijo="mm²/m" valor={ap} onChange={setAp} />
              <div className="col-span-full">
                <PanelAyuda titulo="Qué es cada dato">
                  <p>
                    <strong className="text-foreground">h y hp.</strong> h es el espesor total de la
                    losa, chapa incluida; hp es la altura del perfil de chapa. La diferencia, hc = h −
                    hp, es el hormigón macizo sobre la cresta del nervio: si el bloque comprimido no
                    entra ahí, este cálculo simplificado deja de ser válido y hace falta el
                    procedimiento nervado completo de EC4.
                  </p>
                  <p>
                    <strong className="text-foreground">dp.</strong> Profundidad desde la cara superior
                    del hormigón hasta el centroide de la chapa, no hasta su cara inferior. Sale de la
                    ficha técnica del perfil.
                  </p>
                  <p>
                    <strong className="text-foreground">Ap.</strong> Área neta de la chapa por metro de
                    losa, de catálogo del fabricante — no se deduce de un espesor y un ancho eficaz
                    supuestos.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fypk" etiqueta="fyp,k chapa" sufijo="MPa" valor={fypk} onChange={setFypk} />
              <CampoNumerico id="fck" etiqueta="fck hormigón" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fykBarras" etiqueta="fyk barras" sufijo="MPa" valor={fykBarras} onChange={setFykBarras} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Barra adicional por nervio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="phiBarra" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiBarra} onChange={setPhiBarra} />
              <CampoNumerico id="sepBarra" etiqueta="Separación" sufijo="mm" valor={sepBarra} onChange={setSepBarra} />
              <CampoNumerico id="recBarra" etiqueta="Recub. inferior" sufijo="m" valor={recBarra} onChange={setRecBarra} />
              <p className="col-span-full text-xs text-muted-foreground">
                φ = 0 para calcular sin barra adicional, sólo con la chapa. El recubrimiento se mide
                desde la cara inferior de la losa hasta el eje de la barra.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solicitación</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="mEd" etiqueta="MEd" sufijo="kN·m/m" valor={mEd} onChange={setMEd} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Situación de incendio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoSeleccion
                id="resistenciaFuego" etiqueta="Resistencia al fuego"
                valor={resistenciaFuego} opciones={RESISTENCIAS_FUEGO}
                onChange={(v) => setResistenciaFuego(v as ResistenciaFuego)}
              />
              <CampoNumerico id="etaFi" etiqueta="ηfi" valor={etaFi} onChange={setEtaFi} />
              <div className="col-span-full">
                <PanelAyuda titulo="De dónde sale cada dato de fuego">
                  <p>
                    <strong className="text-foreground">ηfi.</strong> Reduce el momento de cálculo en
                    frío al nivel de carga de la combinación de incendio, EC2-1-2 §2.4.2, ec. (2.5):
                    MEd,fi = ηfi·MEd. 0,7 es el valor recomendado como simplificación (Nota 2); si se
                    conocen Gk, Qk y ψ se puede calcular la expresión completa y cargar ese valor.
                  </p>
                  <p>
                    <strong className="text-foreground">Cómo se estima la temperatura de la barra.</strong>{" "}
                    Sin perfiles de temperatura de nervios (Anexo D de EN 1994-1-2), se usa la Tabla
                    5.5 de EC2-1-2 (vigas simplemente apoyadas: el nervio se trata como un alma,
                    art. 5.7.5) y la ec. (5.3), que relaciona 1 mm de recubrimiento de más o de menos
                    con 10 °C de menos o de más sobre los 500 °C de referencia de la tabla. Es una
                    aproximación razonable para predimensionar, no el método específico de EN 1994-1-2.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos: hp y dp tienen que ser menores que h, y el
                recubrimiento de la barra también.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Flexión en frío</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Momento resistente"
                    verifica={resultado.r.frio.verificaFlexion}
                    comparacion={{
                      real: { etiqueta: "MEd", valor: resultado.r.frio.mEdKNm },
                      limite: { etiqueta: "Mpl,Rd", valor: resultado.r.frio.mPlRdKNm },
                      unidad: "kN·m/m",
                      exige: "≤",
                    }}
                  />
                  {!resultado.r.frio.bloqueDentroDeHc && (
                    <p className="text-xs text-destructive">
                      El bloque comprimido (a = {fmt(resultado.r.frio.xplM * 1000, 0)} mm) supera hc = {" "}
                      {fmt(resultado.r.frio.hcM * 1000, 0)} mm: invade el nervio y este cálculo
                      simplificado deja de ser válido. Hace falta el procedimiento nervado de EC4.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "As barras", valor: `${fmt(resultado.r.frio.asBarrasMm2PorM, 1)} mm²/m` },
                      { etiqueta: "fyp,d chapa", valor: `${fmt(resultado.r.frio.fypdMPa, 1)} MPa` },
                      { etiqueta: "fyd barras", valor: `${fmt(resultado.r.frio.fydBarrasMPa, 1)} MPa` },
                      { etiqueta: "fcd", valor: `${fmt(resultado.r.frio.fcdMPa, 2)} MPa` },
                      { etiqueta: "Np,chapa = Ap·fyp,d", valor: `${fmt(resultado.r.frio.npChapaKN)} kN/m` },
                      { etiqueta: "Np,barras = As·fyd", valor: `${fmt(resultado.r.frio.npBarrasKN)} kN/m` },
                      { etiqueta: "Np = Np,chapa + Np,barras", valor: `${fmt(resultado.r.frio.npKN)} kN/m` },
                      { etiqueta: "hc = h − hp", valor: `${fmt(resultado.r.frio.hcM * 1000, 0)} mm` },
                      { etiqueta: "a = Np / (0,85·fcd·b)", valor: `${fmt(resultado.r.frio.xplM * 1000, 1)} mm` },
                      { etiqueta: "z, brazo mecánico", valor: `${fmt(resultado.r.frio.zM * 1000, 1)} mm` },
                      { etiqueta: "Mpl,Rd = Np·z", valor: `${fmt(resultado.r.frio.mPlRdKNm)} kN·m/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Situación de incendio</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {resultado.r.fuego.aMinTabMm === null ? (
                    <p className="text-xs text-destructive">
                      El ancho de nervio cargado queda por debajo del primer par tabulado de la Tabla
                      5.5 para {resistenciaFuego}: no hay dato para interpolar. Ensanchá el nervio o
                      revisá con perfiles de temperatura.
                    </p>
                  ) : (
                    <>
                      <ResultadoCheck
                        etiqueta="Momento resistente en incendio"
                        verifica={resultado.r.fuego.verificaFuego}
                        comparacion={{
                          real: { etiqueta: "MEd,fi", valor: resultado.r.fuego.mEdFiKNm },
                          limite: { etiqueta: "Mfi,Rd", valor: resultado.r.fuego.mFiRdKNm },
                          unidad: "kN·m/m",
                          exige: "≤",
                        }}
                      />
                      {!resultado.r.fuego.thetaCrEnRangoValido && (
                        <p className="text-xs text-destructive">
                          La temperatura estimada (θcr = {fmt(resultado.r.fuego.thetaCrC, 0)} °C) queda
                          fuera del rango 350–700 °C en el que vale la ec. (5.3): el resultado es una
                          extrapolación y conviene revisarlo con perfiles de temperatura reales.
                        </p>
                      )}
                      <ResultadoCheck
                        etiqueta="Espesor de ala (función separadora, informativo)"
                        verifica={resultado.r.fuego.verificaEspesorAla}
                        detalle={`hc ${fmt(resultado.r.frio.hcM * 1000, 0)} mm / mín. tabulado ${resultado.r.fuego.espesorAlaMinMm} mm (Tabla 5.8)`}
                      />
                      <PanelFormulas
                        titulo="Ver cálculo"
                        filas={[
                          { etiqueta: "a real hasta el eje de la barra", valor: `${fmt(resultado.r.fuego.aRealMm, 1)} mm` },
                          { etiqueta: "a mínimo tabulado (Tabla 5.5)", valor: `${fmt(resultado.r.fuego.aMinTabMm, 1)} mm` },
                          { etiqueta: "θcr = 500 − 10·(a real − a tab)  (5.3)", valor: `${fmt(resultado.r.fuego.thetaCrC, 0)} °C` },
                          { etiqueta: "ks(θcr)", valor: fmt(resultado.r.fuego.ksTheta, 3) },
                          { etiqueta: "fsd,fi = ks(θcr)·fyk", valor: `${fmt(resultado.r.fuego.fsdFiMPa, 1)} MPa` },
                          { etiqueta: "Np,fi = As·fsd,fi (chapa nula)", valor: `${fmt(resultado.r.fuego.npFiKN)} kN/m` },
                          { etiqueta: "a bloque comprimido, en fuego", valor: `${fmt(resultado.r.fuego.xplFiM * 1000, 1)} mm` },
                          { etiqueta: "z en fuego", valor: `${fmt(resultado.r.fuego.zFiM * 1000, 1)} mm` },
                          { etiqueta: "Mfi,Rd = Np,fi·z", valor: `${fmt(resultado.r.fuego.mFiRdKNm)} kN·m/m` },
                          { etiqueta: "MEd,fi = ηfi·MEd", valor: `${fmt(resultado.r.fuego.mEdFiKNm)} kN·m/m` },
                        ]}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
