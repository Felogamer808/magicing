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
import { DiagramaModosFallo } from "@/components/verificaciones/madera/DiagramaModosFallo";
import {
  NOMBRE_CLAVIJA,
  NOMBRE_ESPECIE_UNION,
  chapaCentralDoble,
  chapasExterioresDoble,
  clasificarChapa,
  cortaduraDobleMaderaMadera,
  cortaduraSimpleMaderaMadera,
  fh0k,
  fhAlphaK,
  k90,
  myRkNmm,
  numeroEficaz,
  type EspecieUnion,
  type TipoClavija,
} from "@/lib/calc/ec5/uniones";
import { GAMMA_M_UNIONES, kmod } from "@/lib/calc/ec5/materiales";
import {
  duracionDesdeEtiqueta,
  servicioDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import { NOMBRE_DURACION } from "@/lib/calc/ec5/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-uniones")!;

const CONFIGURACIONES = [
  "Madera-madera, cortadura simple",
  "Madera-madera, cortadura doble",
  "Chapas de acero exteriores, cortadura doble",
  "Chapa de acero central, cortadura doble",
] as const;

const CLAVIJAS = Object.values(NOMBRE_CLAVIJA);
const clavijaDesde = (e: string): TipoClavija =>
  ((Object.entries(NOMBRE_CLAVIJA) as [TipoClavija, string][]).find(([, n]) => n === e)?.[0] ??
    "perno");

const ESPECIES = Object.values(NOMBRE_ESPECIE_UNION);
const especieDesde = (e: string): EspecieUnion =>
  ((Object.entries(NOMBRE_ESPECIE_UNION) as [EspecieUnion, string][]).find(([, n]) => n === e)?.[0] ??
    "conifera");

const CLASES_SERVICIO = ["Clase 1", "Clase 2", "Clase 3"] as const;
const DURACIONES = Object.values(NOMBRE_DURACION);

export default function MaderaUnionesPage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [config, setConfig] = useCampo("config", CONFIGURACIONES[1]);
  const [clavija, setClavija] = useCampo("clavija", NOMBRE_CLAVIJA.perno);
  const [especie, setEspecie] = useCampo("especie", NOMBRE_ESPECIE_UNION.conifera);
  const [servicio, setServicio] = useCampo("servicio", "Clase 2");
  const [duracion, setDuracion] = useCampo("duracion", NOMBRE_DURACION.media);

  const [d, setD] = useCampo("d", "10");
  const [fuk, setFuk] = useCampo("fuk", "400");
  const [t1, setT1] = useCampo("t1", "38");
  const [t2, setT2] = useCampo("t2", "65");
  const [rho1, setRho1] = useCampo("rho1", "320");
  const [rho2, setRho2] = useCampo("rho2", "320");
  const [angulo, setAngulo] = useCampo("angulo", "0");
  const [espesorChapa, setEspesorChapa] = useCampo("espesorChapa", "6");

  const [fax, setFax] = useCampo("fax", "0");
  const [nMedios, setNMedios] = useCampo("nMedios", "4");
  const [separacion, setSeparacion] = useCampo("separacion", "70");
  const [planos, setPlanos] = useCampo("planos", "2");
  const [fed, setFed] = useCampo("fed", "40");

  const r = useMemo(() => {
    const dV = aNumero(d);
    const fukV = aNumero(fuk);
    const t1V = aNumero(t1);
    const t2V = aNumero(t2);
    const rho1V = aNumero(rho1);
    const rho2V = aNumero(rho2);
    const ang = aNumero(angulo);
    const chapa = aNumero(espesorChapa);
    const faxV = aNumero(fax);
    const n = aNumero(nMedios);
    const sep = aNumero(separacion);
    const nPlanos = aNumero(planos);
    const fedV = aNumero(fed);

    if (![dV, fukV, t1V, t2V, rho1V, rho2V].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![ang, faxV, chapa].every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (![n, sep, nPlanos, fedV].every((x) => Number.isFinite(x) && x > 0)) return null;

    const esp = especieDesde(especie);
    const tipo = clavijaDesde(clavija);

    const factorK90 = k90(esp, dV);
    const fh1 = fhAlphaK(fh0k(dV, rho1V), factorK90, ang);
    const fh2 = fhAlphaK(fh0k(dV, rho2V), factorK90, ang);
    const my = myRkNmm(fukV, dV);

    const comunMadera = {
      dMm: dV, t1Mm: t1V, t2Mm: t2V,
      fh1kMPa: fh1, fh2kMPa: fh2, myRkNmm: my, faxRkKN: faxV, tipo,
    };
    const comunAcero = {
      dMm: dV, tMm: t1V, fhkMPa: fh1, myRkNmm: my,
      faxRkKN: faxV, tipo, espesorChapaMm: chapa,
    };

    const union =
      config === CONFIGURACIONES[0]
        ? cortaduraSimpleMaderaMadera(comunMadera)
        : config === CONFIGURACIONES[1]
          ? cortaduraDobleMaderaMadera(comunMadera)
          : config === CONFIGURACIONES[2]
            ? chapasExterioresDoble({ ...comunAcero, tMm: t2V })
            : chapaCentralDoble(comunAcero);

    const usaChapa = config === CONFIGURACIONES[2] || config === CONFIGURACIONES[3];

    const nef = numeroEficaz(n, sep, dV);
    const km = kmod(esp === "lvl" ? "LVL" : "maciza",
                    servicioDesdeEtiqueta(servicio), duracionDesdeEtiqueta(duracion));

    // Ec. (2.17): la capacidad de la unión también pasa por kmod y γM.
    const fvRdPorMedioKN = (km * union.fvRkKN) / GAMMA_M_UNIONES;
    const capacidadKN = fvRdPorMedioKN * nef * nPlanos;

    return {
      dV, fh1, fh2, my, factorK90, union, usaChapa,
      claseChapa: clasificarChapa(chapa, dV),
      nef, n, km, fvRdPorMedioKN, capacidadKN, fedV, nPlanos,
      aprovechamiento: capacidadKN > 0 ? fedV / capacidadKN : Infinity,
    };
  }, [d, fuk, t1, t2, rho1, rho2, angulo, espesorChapa, fax, nMedios, separacion,
      planos, fed, config, clavija, especie, servicio, duracion]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Uniones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          El método de Johansen consiste en escribir todos los modos de fallo posibles y quedarse
          con el menor. De ahí sale la trampa principal del artículo:{" "}
          <strong className="text-foreground">omitir un modo es siempre inseguro</strong>, porque el
          mínimo de menos candidatos nunca es más chico. Acá se escriben todos y se muestran uno al
          lado del otro.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="config" etiqueta="Tipo de unión" valor={config}
                              opciones={CONFIGURACIONES} onChange={setConfig} />
              <div className="grid grid-cols-2 gap-4">
                <CampoSeleccion id="clavija" etiqueta="Medio de fijación" valor={clavija}
                                opciones={CLAVIJAS} onChange={setClavija} />
                <CampoSeleccion id="especie" etiqueta="Especie" valor={especie}
                                opciones={ESPECIES} onChange={setEspecie} />
                <CampoSeleccion id="servicio" etiqueta="Clase de servicio" valor={servicio}
                                opciones={CLASES_SERVICIO} onChange={setServicio} />
                <CampoSeleccion id="duracion" etiqueta="Duración de la carga" valor={duracion}
                                opciones={DURACIONES} onChange={setDuracion} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Clavija y piezas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="d" etiqueta="Diámetro d" sufijo="mm" valor={d} onChange={setD}
                               sugerencias={[8, 10, 12, 16, 20, 24]} />
                <CampoNumerico id="fuk" etiqueta="fu,k del acero" sufijo="MPa" valor={fuk} onChange={setFuk} />
                <CampoNumerico id="t1" etiqueta="t1" sufijo="mm" valor={t1} onChange={setT1} />
                <CampoNumerico id="t2" etiqueta="t2" sufijo="mm" valor={t2} onChange={setT2} />
                <CampoNumerico id="rho1" etiqueta="ρk pieza 1" sufijo="kg/m³" valor={rho1} onChange={setRho1} />
                <CampoNumerico id="rho2" etiqueta="ρk pieza 2" sufijo="kg/m³" valor={rho2} onChange={setRho2} />
                <CampoNumerico id="angulo" etiqueta="Ángulo carga-fibra" sufijo="°"
                               valor={angulo} onChange={setAngulo} />
                <CampoNumerico id="espesorChapa" etiqueta="Espesor de chapa" sufijo="mm"
                               valor={espesorChapa} onChange={setEspesorChapa} />
              </div>
              <PanelAyuda titulo="Las unidades de este artículo, que son la trampa">
                <p>
                  <strong className="text-foreground">Todo va en milímetros y newtons.</strong> La
                  ec. (8.32) escribe fh,0,k = 0,082·(1 − 0,01·d)·ρk con{" "}
                  <em>d en milímetros</em>. Poniendo el diámetro en metros el paréntesis pasa de
                  0,90 a 0,9999 y la resistencia al aplastamiento sale un 11 % alta, sin que
                  ningún resultado intermedio lo delate.
                </p>
                <p>
                  <strong className="text-foreground">fu,k, no fy,k.</strong> El momento plástico
                  de la ec. (8.30) usa la resistencia a <em>tracción</em> del acero del perno.
                </p>
                <p>
                  <strong className="text-foreground">t1 y t2</strong> cambian de significado según
                  la configuración: en cortadura simple, t1 es la pieza de cabeza y t2 la
                  penetración; en doble, t1 son las laterales y t2 la central.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Grupo y solicitación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="nMedios" etiqueta="n en la fila" valor={nMedios} onChange={setNMedios} />
                <CampoNumerico id="separacion" etiqueta="Separación a1" sufijo="mm"
                               valor={separacion} onChange={setSeparacion} />
                <CampoNumerico id="planos" etiqueta="Planos de cortadura" valor={planos} onChange={setPlanos} />
                <CampoNumerico id="fax" etiqueta="Fax,Rk (efecto soga)" sufijo="kN"
                               valor={fax} onChange={setFax} />
              </div>
              <CampoNumerico id="fed" etiqueta="Fv,Ed de la unión" sufijo="kN" valor={fed} onChange={setFed} />
              <PanelAyuda titulo="Por qué una fila de n pernos no vale n pernos">
                <p>
                  El reparto entre pernos alineados con la fibra no es uniforme: los de los
                  extremos toman más carga y la madera se hiende antes de que los del medio
                  lleguen a su capacidad. La ec. (8.34) lo recoge con un número eficaz nef que
                  puede quedar en 0,7·n. Ignorarlo sobrestima la unión un 40 %.
                </p>
                <p>
                  Sólo aplica a la componente <em>paralela a la fibra</em>, y sólo dentro de cada
                  fila: dos filas separadas perpendicularmente suman enteras.
                </p>
                <p>
                  El <strong className="text-foreground">efecto soga</strong> es el aporte de la
                  tracción axial de la clavija, Fax,Rk/4, topado por el art. 8.2.2(2) según el
                  tipo: 25 % en pernos, 15 % en clavos circulares, 100 % en tirafondos y{" "}
                  <strong className="text-foreground">0 % en pasadores</strong>, que sin cabeza ni
                  rosca no tienen de dónde agarrarse. Si no se conoce Fax,Rk, va cero.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá diámetro, espesores, densidades y el grupo con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Capacidad de la unión"
                    verifica={r.aprovechamiento <= 1}
                    comparacion={{
                      real: { etiqueta: "Fv,Ed", valor: r.fedV },
                      limite: { etiqueta: "Fv,Rd", valor: r.capacidadKN },
                      unidad: "kN", exige: "≤", decimales: 2,
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {fmt(r.fvRdPorMedioKN, 2)} kN por plano y por medio × {fmt(r.nef, 2)} medios
                    eficaces (de {fmt(r.n, 0)}) × {fmt(r.nPlanos, 0)} planos.
                  </p>
                  {r.usaChapa && r.claseChapa === "intermedia" && (
                    <p className="text-xs text-muted-foreground">
                      La chapa cae entre delgada y gruesa: el art. 8.2.3(1) manda interpolar
                      linealmente, y eso es lo que se hizo. Clasificarla con un umbral daría un
                      salto de régimen de hasta el 30 %.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Modos de fallo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <DiagramaModosFallo resultado={r.union} />
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "k90  (8.33)", valor: fmt(r.factorK90, 3) },
                      {
                        etiqueta: "fh,1,k  (8.32) y (8.31)",
                        valor: `${fmt(r.fh1, 2)} MPa`,
                        formula: "0,082·(1 − 0,01·d)·ρk / (k90·sen²α + cos²α)",
                      },
                      { etiqueta: "fh,2,k", valor: `${fmt(r.fh2, 2)} MPa` },
                      {
                        etiqueta: "My,Rk  (8.30)",
                        valor: `${fmt(r.my, 0)} N·mm`,
                        formula: "0,3 · fu,k · d^2,6",
                      },
                      { etiqueta: "Fv,Rk por plano y medio", valor: `${fmt(r.union.fvRkKN, 3)} kN` },
                      { etiqueta: "kmod (tabla 3.1)", valor: fmt(r.km, 2) },
                      { etiqueta: "γM de uniones (tabla 2.3)", valor: fmt(GAMMA_M_UNIONES, 2) },
                      { etiqueta: "Fv,Rd por plano y medio", valor: `${fmt(r.fvRdPorMedioKN, 3)} kN` },
                      { etiqueta: "nef  (8.34)", valor: fmt(r.nef, 3) },
                      { etiqueta: "Fv,Rd de la unión", valor: `${fmt(r.capacidadKN, 2)} kN` },
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
