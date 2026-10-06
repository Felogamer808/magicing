"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
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
} from "@/lib/calc/madera/uniones";
import { GAMMA_M_UNIONES } from "@/lib/calc/madera/materiales";
import { NOMBRE_DURACION } from "@/lib/calc/madera/materiales";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { CONFIGURACIONES, resolverMaderaUniones } from "@/lib/calc/madera/resolver-madera-uniones";
import { recomendarMaderaUniones } from "@/lib/verificaciones/recomendaciones/madera";

const meta = registroVerificaciones.find((v) => v.id === "madera-uniones")!;

const ETAPAS = [
  { id: "configuracion", titulo: "Configuración" },
  { id: "piezas", titulo: "Clavija y piezas" },
  { id: "grupo", titulo: "Grupo" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const CLAVIJAS = Object.values(NOMBRE_CLAVIJA);

const ESPECIES = Object.values(NOMBRE_ESPECIE_UNION);

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

  const campos = useMemo(
    () => ({ d, fuk, t1, t2, rho1, rho2, angulo, espesorChapa, fax, nMedios, separacion, planos, fed, config, clavija, especie, servicio, duracion }),
    [d, fuk, t1, t2, rho1, rho2, angulo, espesorChapa, fax, nMedios, separacion, planos, fed, config, clavija, especie, servicio, duracion]
  );
  const r = useMemo(() => resolverMaderaUniones(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarMaderaUniones(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!r) avisos.push({ tipo: "error", texto: "Cargá diámetro, espesores, densidades y el grupo con valores válidos." });
  else if (r.usaChapa && r.claseChapa === "intermedia") avisos.push({ tipo: "aviso", texto: "La chapa cae entre delgada y gruesa: se interpola linealmente, como manda el art. 8.2.3(1)." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Uniones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="configuracion" numero={1} titulo="Configuración" descripcion="Tipo de unión, medio de fijación y condiciones de servicio.">
          <div className="max-w-2xl space-y-4">
            <CampoSeleccion id="config" etiqueta="Tipo de unión" valor={config} opciones={CONFIGURACIONES} onChange={setConfig} />
            <div className="grid grid-cols-2 gap-4">
              <CampoSeleccion id="clavija" etiqueta="Medio de fijación" valor={clavija} opciones={CLAVIJAS} onChange={setClavija} />
              <CampoSeleccion id="especie" etiqueta="Especie" valor={especie} opciones={ESPECIES} onChange={setEspecie} />
              <CampoSeleccion id="servicio" etiqueta="Clase de servicio" valor={servicio} opciones={CLASES_SERVICIO} onChange={setServicio} />
              <CampoSeleccion id="duracion" etiqueta="Duración de la carga" valor={duracion} opciones={DURACIONES} onChange={setDuracion} />
            </div>
          </div>
        </Etapa>

        <Etapa id="piezas" numero={2} titulo="Clavija y piezas" descripcion="Todo en milímetros y newtons, como lo escribe el articulado.">
          <div className="max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="d" etiqueta="Diámetro d" sufijo="mm" valor={d} onChange={setD} sugerencias={[8, 10, 12, 16, 20, 24]} />
              <CampoNumerico id="fuk" etiqueta="fu,k del acero" sufijo="MPa" valor={fuk} onChange={setFuk} />
              <CampoNumerico id="t1" etiqueta="t1" sufijo="mm" valor={t1} onChange={setT1} />
              <CampoNumerico id="t2" etiqueta="t2" sufijo="mm" valor={t2} onChange={setT2} />
              <CampoNumerico id="rho1" etiqueta="ρk pieza 1" sufijo="kg/m³" valor={rho1} onChange={setRho1} />
              <CampoNumerico id="rho2" etiqueta="ρk pieza 2" sufijo="kg/m³" valor={rho2} onChange={setRho2} />
              <CampoNumerico id="angulo" etiqueta="Ángulo carga-fibra" sufijo="°" valor={angulo} onChange={setAngulo} />
              <CampoNumerico id="espesorChapa" etiqueta="Espesor de chapa" sufijo="mm" valor={espesorChapa} onChange={setEspesorChapa} />
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
          </div>
        </Etapa>

        <Etapa id="grupo" numero={3} titulo="Grupo y solicitación" descripcion="Medios en la fila, planos de cortadura y la fuerza que transmite la unión.">
          <div className="max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="nMedios" etiqueta="n en la fila" valor={nMedios} onChange={setNMedios} />
              <CampoNumerico id="separacion" etiqueta="Separación a1" sufijo="mm" valor={separacion} onChange={setSeparacion} />
              <CampoNumerico id="planos" etiqueta="Planos de cortadura" valor={planos} onChange={setPlanos} />
              <CampoNumerico id="fax" etiqueta="Fax,Rk (efecto soga)" sufijo="kN" valor={fax} onChange={setFax} />
              <CampoNumerico id="fed" etiqueta="Fv,Ed de la unión" sufijo="kN" valor={fed} onChange={setFed} />
            </div>
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
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Unión", valor: config },
              { etiqueta: "Medio · especie", valor: `${clavija} · ${especie}` },
              { etiqueta: "Servicio · duración", valor: `${servicio} · ${duracion}` },
              { etiqueta: "d · fu,k", valor: `${d} mm · ${fuk} MPa` },
              { etiqueta: "t1 · t2", valor: `${t1} · ${t2} mm` },
              { etiqueta: "ρk 1 · ρk 2", valor: `${rho1} · ${rho2} kg/m³` },
              { etiqueta: "Ángulo carga-fibra", valor: `${angulo}°` },
              { etiqueta: "Grupo", valor: `${nMedios} en la fila, a1 = ${separacion} mm, ${planos} planos` },
              { etiqueta: "Fv,Ed · Fax,Rk", valor: `${fed} · ${fax} kN` },
              ...(r ? [{ etiqueta: "nef", valor: fmt(r.nef, 2), derivado: true }] : []),
            ]}
            hipotesis={[
              "EC5, art. 8.2 (Johansen): se escriben todos los modos de fallo y gobierna el menor.",
              "fh,α,k por las ecs. (8.31) a (8.33); My,Rk con fu,k por la ec. (8.30).",
              "Efecto soga topado por el art. 8.2.2(2) según el tipo de medio.",
              "Chapa entre delgada y gruesa: interpolación lineal (art. 8.2.3(1)).",
              "nef de la ec. (8.34) aplicado a la fila; la capacidad pasa por kmod y γM de uniones (ec. 2.17).",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!r ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionAutomatica />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Fv,Rk por plano y medio", valor: `${fmt(r.union.fvRkKN, 2)} kN` },
                  { etiqueta: "Fv,Rd por plano y medio", valor: `${fmt(r.fvRdPorMedioKN, 2)} kN`, nota: `kmod ${fmt(r.km, 2)}` },
                  { etiqueta: "nef", valor: fmt(r.nef, 2), nota: `de ${fmt(r.n, 0)} medios` },
                  { etiqueta: "Fv,Rd de la unión", valor: `${fmt(r.capacidadKN, 2)} kN`, nota: `${fmt(r.nPlanos, 0)} planos` },
                ]}
              />

              <Subgrupo titulo="Capacidad de la unión">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Capacidad de la unión"
                    verifica={r.aprovechamiento <= 1}
                    comparacion={{
                      real: { etiqueta: "Fv,Ed", valor: r.fedV },
                      limite: { etiqueta: "Fv,Rd", valor: r.capacidadKN },
                      unidad: "kN", exige: "≤", decimales: 2,
                    }}
                    detalle={`${fmt(r.fvRdPorMedioKN, 2)} kN por plano y por medio × ${fmt(r.nef, 2)} medios eficaces × ${fmt(r.nPlanos, 0)} planos`}
                    recomendaciones={rec.union}
                  />
                  <DiagramaModosFallo resultado={r.union} />
                  <PanelFormulas
                    titulo="Ver desarrollo de la capacidad"
                    filas={[
                      { etiqueta: "k90  (8.33)", valor: fmt(r.factorK90, 3) },
                      {
                        etiqueta: "fh,1,k  (8.32) y (8.31)",
                        valor: `${fmt(r.fh1, 2)} MPa`,
                        formula: "0,082·(1 − 0,01·d)·ρk / (k90·sen²α + cos²α)",
                      },
                      { etiqueta: "fh,2,k", valor: `${fmt(r.fh2, 2)} MPa` },
                      { etiqueta: "My,Rk  (8.30)", valor: `${fmt(r.my, 0)} N·mm`, formula: "0,3 · fu,k · d^2,6" },
                      { etiqueta: "Fv,Rk por plano y medio", valor: `${fmt(r.union.fvRkKN, 3)} kN` },
                      { etiqueta: "kmod (tabla 3.1)", valor: fmt(r.km, 2) },
                      { etiqueta: "γM de uniones (tabla 2.3)", valor: fmt(GAMMA_M_UNIONES, 2) },
                      { etiqueta: "Fv,Rd por plano y medio", valor: `${fmt(r.fvRdPorMedioKN, 3)} kN` },
                      { etiqueta: "nef  (8.34)", valor: fmt(r.nef, 3) },
                      { etiqueta: "Fv,Rd de la unión", valor: `${fmt(r.capacidadKN, 2)} kN` },
                    ]}
                  />
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
