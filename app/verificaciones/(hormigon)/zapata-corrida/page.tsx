"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ZapataCorridaDiagrama } from "@/components/verificaciones/hormigon/ZapataCorridaDiagrama";
import { CorteArmaduraZapata } from "@/components/verificaciones/hormigon/CorteArmaduraZapata";
import { DiagramaPresionSuelo } from "@/components/verificaciones/hormigon/DiagramaPresionSuelo";
import { TarjetaLadoZapata } from "@/components/verificaciones/hormigon/TarjetaLadoZapata";
import { DiagramaTiranteTerreno } from "@/components/verificaciones/hormigon/DiagramaTiranteTerreno";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularZapataCorrida } from "@/lib/calc/hormigon/cimentaciones/zapata-corrida";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisZapataCorrida,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-corrida")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const POSICIONES = ["Centrado", "Ubicación libre", "Contra la medianera"] as const;
const EQUILIBRIOS = ["Lo toma el terreno", "Par tirante–terreno"] as const;
const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

export default function ZapataCorridaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "1");
  const [H, setH] = useCampo("H", "0.4");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [anchoPilar, setAnchoPilar] = useCampo("anchoPilar", "0.3");

  // Dónde cae el muro. "Contra la medianera" es un atajo: deja la distancia
  // en 0 y pasa a ubicación libre.
  const [posicionMuro, setPosicionMuro] = useCampo("posicionMuro", POSICIONES[0]);
  const [distanciaBorde, setDistanciaBorde] = useCampo("distanciaBorde", "0");
  const descentrado = posicionMuro === POSICIONES[1];
  const [equilibrio, setEquilibrio] = useCampo("equilibrio", EQUILIBRIOS[0]);
  const [brazoTirante, setBrazoTirante] = useCampo("brazoTirante", "3");
  const [phiTerreno, setPhiTerreno] = useCampo("phiTerreno", "30");
  const conTirante = descentrado && equilibrio === EQUILIBRIOS[1];

  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "300");
  const [Nk, setNk] = useCampo("Nk", "100");
  const [MkA, setMkA] = useCampo("MkA", "15");

  const [diametroPrincipal, setDiametroPrincipal] = useCampo("diametroPrincipal", "16");
  const [separacionPrincipal, setSeparacionPrincipal] = useCampo("separacionPrincipal", "0.15");
  const [numeroSecundario, setNumeroSecundario] = useCampo("numeroSecundario", "4");
  const [diametroSecundario, setDiametroSecundario] = useCampo("diametroSecundario", "10");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "recta");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      anchoPilar: aNumero(anchoPilar),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      Nk: aNumero(Nk),
      MkA: aNumero(MkA),
      diametroPrincipal: aNumero(diametroPrincipal),
      separacionPrincipal: aNumero(separacionPrincipal),
      numeroSecundario: aNumero(numeroSecundario),
      diametroSecundario: aNumero(diametroSecundario),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.A > 0 && v.H > 0 && v.anchoPilar > 0 && v.anchoPilar <= v.A;
    const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
    const armadurasValidas =
      v.diametroPrincipal > 0 && v.separacionPrincipal > 0 && v.numeroSecundario > 0 && v.diametroSecundario > 0;
    const cargasValidas = v.Nk > 0;

    if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
      return null;
    }

    const borde = aNumero(distanciaBorde);
    if (descentrado && !(borde >= 0 && borde + v.anchoPilar <= v.A + 1e-9)) return null;
    const brazo = aNumero(brazoTirante);
    const phi = aNumero(phiTerreno);
    if (conTirante && !(brazo > 0 && phi > 0 && phi < 90)) return null;

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = {
      A: v.A, H: v.H, anchoPilar: v.anchoPilar, recubrimiento: v.recubrimiento,
      ...(descentrado ? { distanciaBorde: borde } : {}),
    };

    const zapata = calcularZapataCorrida(materiales, geometria, v.sigmaAdmisible, {
      carga: { Nk: v.Nk, MkA: v.MkA },
      armadoPrincipal: { diametroMm: v.diametroPrincipal, separacionM: v.separacionPrincipal },
      armadoSecundario: { numero: v.numeroSecundario, diametroMm: v.diametroSecundario },
      formaAnclaje,
      ...(conTirante ? { tirante: { brazoM: brazo, phiGrados: phi } } : {}),
    });

    return { zapata };
  }, [
    fck, fyk, A, H, recubrimiento, anchoPilar, descentrado, distanciaBorde, conTirante, brazoTirante, phiTerreno,
    sigmaAdmisible, Nk, MkA,
    diametroPrincipal, separacionPrincipal, numeroSecundario, diametroSecundario, formaAnclaje,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      A: aNumero(A),
      H: aNumero(H),
      anchoPilar: aNumero(anchoPilar),
      recubrimiento: aNumero(recubrimiento),
      diametroPrincipal: aNumero(diametroPrincipal),
      separacionPrincipal: aNumero(separacionPrincipal),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    const borde = aNumero(distanciaBorde);
    return {
      AM: v.A,
      HM: v.H,
      anchoPilarM: v.anchoPilar,
      dM: v.H - v.recubrimiento - v.diametroPrincipal / 2000,
      diametroPrincipalMm: v.diametroPrincipal,
      separacionPrincipalM: v.separacionPrincipal,
      ...(descentrado && Number.isFinite(borde) ? { distanciaBordeM: borde } : {}),
    };
  }, [A, H, anchoPilar, recubrimiento, diametroPrincipal, separacionPrincipal, descentrado, distanciaBorde]);

  const cambiarPosicion = (valor: string) => {
    if (valor === POSICIONES[2]) {
      setDistanciaBorde("0");
      setPosicionMuro(POSICIONES[1]);
      return;
    }
    if (valor === POSICIONES[1] && !descentrado) {
      // Al pasar a ubicación libre se arranca de la posición centrada.
      const a = aNumero(A);
      const c = aNumero(anchoPilar);
      if (Number.isFinite(a) && Number.isFinite(c)) setDistanciaBorde(String(Math.max((a - c) / 2, 0)));
    }
    setPosicionMuro(valor);
  };

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: descentrado
        ? "Hay datos vacíos o no válidos, o el muro queda fuera de la zapata: la distancia de su cara al borde más su espesor no puede superar A."
        : "Hay datos vacíos o no válidos: no se puede calcular.",
    });
  } else if (resultado.zapata.tirante && !resultado.zapata.tirante.geometriaValida) {
    avisos.push({
      tipo: "error",
      texto: "El brazo del tirante tiene que ser mayor que el canto de la zapata: se mide del eje del tirante a la base.",
    });
  } else if (!Number.isFinite(resultado.zapata.geotecnico.sigmaKPa)) {
    avisos.push({
      tipo: "error",
      texto: "La resultante cae fuera de la base: la zapata no tiene apoyo posible.",
    });
  } else if (!resultado.zapata.geotecnico.dentroDelNucleo) {
    avisos.push({
      tipo: "error",
      texto: "La resultante sale del núcleo central y la zapata se despega: no verifica el terreno. Con el muro contra la medianera, la salida habitual es el par tirante–terreno.",
    });
  }

  const vuelos = resultado
    ? resultado.zapata.muroCentrado
      ? [{ nombre: "Vuelo", r: resultado.zapata.principal }]
      : [
          { nombre: "Vuelo izquierdo", r: resultado.zapata.vuelos.inicio },
          { nombre: "Vuelo derecho", r: resultado.zapata.vuelos.fin },
        ]
    : [];

  const corte = diagrama ? (
    <ZapataCorridaDiagrama {...diagrama} />
  ) : (
    <CroquisZapataCorrida />
  );

  const armado = diagrama ? (
    <CorteArmaduraZapata
      largoM={diagrama.AM}
      HM={diagrama.HM}
      anchoApoyoM={diagrama.anchoPilarM}
      distanciaBordeM={diagrama.distanciaBordeM}
      recubrimientoM={aNumero(recubrimiento)}
      diametroA1Mm={diagrama.diametroPrincipalMm}
      numeroA2={aNumero(numeroSecundario)}
      diametroA2Mm={aNumero(diametroSecundario)}
      patilla={formaAnclaje === "gancho"}
      apoyo="muro"
      resumen={[
        { etiqueta: "A1 · principal", valor: `Ø${diagrama.diametroPrincipalMm} c/${fmt(diagrama.separacionPrincipalM, 2)} m` },
        { etiqueta: "A1 · extremo", valor: FORMAS[formaAnclaje].toLowerCase() },
        { etiqueta: "A2 · reparto", valor: `${numeroSecundario} Ø${diametroSecundario} en todo A` },
        { etiqueta: "d", valor: `${fmt(diagrama.dM, 2)} m` },
        { etiqueta: "Recubrimiento", valor: `${fmt(aNumero(recubrimiento), 2)} m` },
      ]}
    />
  ) : (
    corte
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · verificación por metro corrido</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="Corte transversal de la zapata, por metro corrido.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales y suelo">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="sigmaAdmisible" etiqueta="σ adm. suelo" sufijo="kN/m²" valor={sigmaAdmisible} onChange={setSigmaAdmisible} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Zapata y muro">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="A" etiqueta="A (ancho)" sufijo="m" valor={A} onChange={setA} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    <CampoNumerico id="anchoPilar" etiqueta="Espesor del muro" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
                    <div className="col-span-2">
                      <CampoSeleccion
                        id="posicionMuro"
                        etiqueta="Dónde cae el muro"
                        valor={posicionMuro}
                        opciones={POSICIONES}
                        onChange={cambiarPosicion}
                      />
                    </div>
                    {descentrado && (
                      <>
                        <CampoNumerico id="distanciaBorde" etiqueta="Cara al borde izquierdo" sufijo="m" valor={distanciaBorde} onChange={setDistanciaBorde} />
                        <p className="col-span-2 text-xs text-muted-foreground">
                          0 es el muro contra la medianera. El momento del descentramiento, Nk·e, sale
                          solo: no hace falta cargarlo en Mk.
                        </p>
                        <div className="col-span-2">
                          <CampoSeleccion
                            id="equilibrio"
                            etiqueta="Quién toma el momento"
                            valor={equilibrio}
                            opciones={EQUILIBRIOS}
                            onChange={setEquilibrio}
                          />
                        </div>
                        {conTirante && (
                          <>
                            <CampoNumerico id="brazoTirante" etiqueta="h: tirante → base" sufijo="m" valor={brazoTirante} onChange={setBrazoTirante} />
                            <CampoNumerico id="phiTerreno" etiqueta="φ' del terreno" sufijo="°" valor={phiTerreno} onChange={setPhiTerreno} />
                            <p className="col-span-2 text-xs text-muted-foreground">
                              La losa tira del muro arriba y el rozamiento lo frena en la base: ese par
                              toma el momento y la presión queda uniforme. h va del eje del tirante a la
                              base de la zapata.
                            </p>
                            <div className="col-span-2 max-w-sm">
                              <DiagramaTiranteTerreno elemento="muro" hM={aNumero(brazoTirante)} HM={aNumero(H)} />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={corte}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Esfuerzos característicos por metro corrido.">
          <div className="grid max-w-md grid-cols-2 gap-4">
            <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN/m" valor={Nk} onChange={setNk} />
            <CampoNumerico id="MkA" etiqueta="Mk" sufijo="kN·m/m" valor={MkA} onChange={setMkA} />
            <p className="col-span-2 text-xs text-muted-foreground">
              Mk es el momento que baja por el muro, positivo hacia el borde derecho.
            </p>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Principal transversal al muro y de reparto a lo largo.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Principal">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDiametro id="diametroPrincipal" etiqueta="Ø" valor={diametroPrincipal} onChange={setDiametroPrincipal} />
                    <CampoNumerico id="separacionPrincipal" etiqueta="Separación" sufijo="m" valor={separacionPrincipal} onChange={setSeparacionPrincipal} />
                    <div className="col-span-2 max-w-xs">
                      <CampoSeleccion
                        id="formaAnclaje"
                        etiqueta="Extremo de las barras"
                        valor={FORMAS[formaAnclaje]}
                        opciones={Object.values(FORMAS)}
                        onChange={(v) => setFormaAnclaje(formaPorNombre(v))}
                      />
                    </div>
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Reparto">
                  <EditorCapas
                    filas={[
                      {
                        posicion: "Reparto, en todo el ancho A",
                        numero: { id: "numeroSecundario", valor: numeroSecundario, onChange: setNumeroSecundario },
                        diametro: { id: "diametroSecundario", valor: diametroSecundario, onChange: setDiametroSecundario },
                      },
                    ]}
                  />
                </Subgrupo>
              </>
            }
            dibujo={armado}
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "A × H", valor: `${A} × ${H} m` },
              { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
              {
                etiqueta: "Muro",
                valor: descentrado ? `${anchoPilar} m, cara a ${distanciaBorde} m del borde` : `${anchoPilar} m, centrado`,
              },
              ...(resultado
                ? [
                    { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN/m`, derivado: true },
                    { etiqueta: "e terreno", valor: `${fmt(resultado.zapata.geotecnico.excentricidadM, 3)} m`, derivado: true },
                    { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Cálculo por metro corrido: es la rebanada de 1 m de una zapata aislada, con el mismo modelo del Anejo 19 (art. 9.8.2, zapatas de pilares y muros).",
              "La tensión sobre el terreno incluye el peso propio, también en la excentricidad, y la resultante tiene que caer dentro del núcleo central (e ≤ A/6). Se comprueba sobre el ancho eficaz A − 2e.",
              "Flexión por el art. 9.8.2.2: sección de cálculo a 0,15·b dentro de la cara del muro, Fs = M/(0,9·d) y As = Fs/fyd. Con el muro descentrado cada vuelo se arma por separado.",
              "Cuantía mínima del art. 9.2.1.1 (1), ec. (9.1); φ ≥ 12 mm (art. 9.8.2.1 (1)); anclaje (art. 8.4) desde x = h/2; cortante sin armadura a d de la cara (art. 6.2.2).",
              "Reparto a lo largo del muro: 20 % de la principal en todo el ancho (art. 9.3.1.1 (2)).",
              "Con par tirante–terreno: Tk = (Nk·e + Mk)/h, presión uniforme (DB SE-C, art. 4.3.1.3 (6)), deslizamiento Tk ≤ (N + P)·tan(3/4·φ')/1,5 (DB SE-C, art. 4.2.3.1 (4) y tabla 2.1) y armadura del tirante 1,5·Tk/fyd. Al muro le queda Mk + Tk·(h − H) en el arranque.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!resultado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionResultados
                comprobaciones={[
                  {
                    etiqueta: "tensión del terreno",
                    estado: resultado.zapata.geotecnico.verificaTension ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.geotecnico.sigmaKPa / aNumero(sigmaAdmisible),
                  },
                  ...vuelos.flatMap((v) => [
                    {
                      etiqueta: `armadura · ${v.nombre.toLowerCase()}`,
                      estado: v.r.verificaAs && v.r.verificaDiametroMinimo ? ("cumple" as const) : ("no-cumple" as const),
                      utilizacion: v.r.asNecCm2 / v.r.asRealCm2,
                    },
                    {
                      etiqueta: `anclaje · ${v.nombre.toLowerCase()}`,
                      estado: v.r.anclaje.verifica ? ("cumple" as const) : ("no-cumple" as const),
                      utilizacion: v.r.anclaje.disponibleMm > 0 ? v.r.anclaje.lbdMm / v.r.anclaje.disponibleMm : 0,
                    },
                    {
                      etiqueta: `cortante · ${v.nombre.toLowerCase()}`,
                      estado: v.r.verificaCorte ? ("cumple" as const) : ("no-cumple" as const),
                      utilizacion: v.r.vRdCKN > 0 ? v.r.vEdKN / v.r.vRdCKN : 0,
                    },
                  ]),
                  {
                    etiqueta: "armadura de reparto",
                    estado: resultado.zapata.secundario.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.secundario.asNecCm2 / resultado.zapata.secundario.asRealCm2,
                  },
                  ...(resultado.zapata.tirante
                    ? [
                        {
                          etiqueta: "deslizamiento",
                          estado: resultado.zapata.tirante.verificaDeslizamiento ? ("cumple" as const) : ("no-cumple" as const),
                          utilizacion: Math.abs(resultado.zapata.tirante.tkKN) / resultado.zapata.tirante.rozamientoResistenteKN,
                        },
                      ]
                    : []),
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.zapata.geotecnico.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(aNumero(sigmaAdmisible))}` },
                  { etiqueta: "d", valor: `${fmt(resultado.zapata.principal.dM, 3)} m` },
                  { etiqueta: "As nec. principal", valor: `${fmt(resultado.zapata.principal.asNecCm2)} cm²/m` },
                  { etiqueta: "As nec. reparto", valor: `${fmt(resultado.zapata.secundario.asNecCm2)} cm²` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Tensión admisible del terreno"
                    verifica={resultado.zapata.geotecnico.verificaTension}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.zapata.geotecnico.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: aNumero(sigmaAdmisible) },
                      unidad: "kN/m²", exige: "≤",
                    }}
                  />
                  <div className="max-w-md pt-4">
                    <DiagramaPresionSuelo
                      distribucion={resultado.zapata.geotecnico.distribucion}
                      lM={aNumero(A)}
                      sigmaAdmisibleKPa={aNumero(sigmaAdmisible)}
                      etiqueta="Ancho A"
                    />
                  </div>
                  <PanelFormulas
                    titulo="Ver desarrollo geotécnico"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN/m` },
                      { etiqueta: "Excentricidad", valor: `${fmt(resultado.zapata.geotecnico.excentricidadM, 3)} m` },
                      { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m` },
                      { etiqueta: "Zapata rígida (vuelo ≤ 2H)", valor: resultado.zapata.esRigida ? "Sí" : "No" },
                    ]}
                  />
                </div>
              </Subgrupo>

              {resultado.zapata.tirante && (
                <Subgrupo titulo="Par tirante–terreno">
                  <div>
                    <ResultadoCheck
                      etiqueta="Deslizamiento de la zapata"
                      verifica={resultado.zapata.tirante.verificaDeslizamiento}
                      detalle={`CTE DB SE-C: δ = 3/4·φ' = ${fmt(resultado.zapata.tirante.deltaGrados, 1)}° (art. 4.2.3.1 (4)), cargas sin mayorar y γR = 1,5 (tabla 2.1). Por metro.`}
                      comparacion={{
                        real: { etiqueta: "Tk", valor: Math.abs(resultado.zapata.tirante.tkKN) },
                        limite: { etiqueta: "(N+P)·tan δ/γR", valor: resultado.zapata.tirante.rozamientoResistenteKN },
                        unidad: "kN/m", exige: "≤",
                      }}
                    />
                    <PanelMetricas
                      horizontal
                      metricas={[
                        { etiqueta: "Tirante Tk / Td", valor: `${fmt(Math.abs(resultado.zapata.tirante.tkKN))} / ${fmt(resultado.zapata.tirante.tdKN)} kN/m` },
                        { etiqueta: "As tirante (losa)", valor: `${fmt(resultado.zapata.tirante.asTiranteCm2)} cm²/m`, nota: "Td/fyd, Anejo 19" },
                        { etiqueta: "Muro: M arranque", valor: `${fmt(Math.abs(resultado.zapata.tirante.mPilarArranqueKNm))} kN·m/m`, nota: "característico" },
                        { etiqueta: "Muro: V", valor: `${fmt(resultado.zapata.tirante.vPilarKN)} kN/m`, nota: "característico" },
                      ]}
                    />
                    <p className="pt-2 text-xs text-muted-foreground">
                      La armadura de la losa tiene que poder tomar el tirante, además de su propia flexión,
                      y anclarse en el muro. El muro queda en flexión con M y V: se verifica aparte. La
                      zapata se arma con la presión uniforme.
                    </p>
                  </div>
                </Subgrupo>
              )}

              <Subgrupo titulo="Comprobaciones estructurales (por metro)">
                <div>
                  {vuelos.map((v) => (
                    <TarjetaLadoZapata key={v.nombre} titulo={v.nombre} resultado={v.r} />
                  ))}
                  <ResultadoCheck
                    etiqueta="Armadura de reparto suficiente"
                    verifica={resultado.zapata.secundario.verificaAs}
                    detalle="Anejo 19, art. 9.3.1.1 (2): 20 % de la principal, en todo el ancho A."
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.zapata.secundario.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.zapata.secundario.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                  />
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
