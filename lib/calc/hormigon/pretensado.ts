/**
 * Elementos pretensados pretesados — ACI 318-19, por el método de tensiones
 * admisibles en servicio y resistencia última en rotura.
 *
 * Reemplaza las planillas "VIGAS PRETENSADAS CON DEFORMACIONES.xlsx" y
 * "CALCULO LOSAS PRETENSADAS.xlsx", que resuelven exactamente el mismo cálculo
 * con datos distintos: una viga rectangular con armadura pasiva y una losa
 * alveolar ancha sin ella. Por eso hay un solo módulo y no dos.
 *
 * El elemento se calcula en dos etapas, y esa es la clave de todo el artículo:
 * el pretensado se introduce sobre la **sección simple** —la pieza premoldeada
 * sola, antes de que fragüe la carpeta— y las cargas posteriores actúan sobre la
 * **sección compuesta**. Mezclar las dos es el error más fácil de cometer acá.
 *
 * Unidades: metros, kN, kN·m, MPa. Las áreas de armadura van en mm², como en
 * los catálogos de torones.
 */

/** Propiedades de una de las dos secciones que intervienen. */
export interface SeccionPretensado {
  hM: number;
  /** Ancho del ala comprimida, para el bloque de compresiones. */
  bM: number;
  areaM2: number;
  iM4: number;
  /** Distancia de la fibra inferior al baricentro. */
  ygM: number;
  perimetroM: number;
}

export interface DatosPretensado {
  /** Resistencia del premoldeado a 28 días. */
  fcPremoldeadoMPa: number;
  /** Resistencia en el momento de transferir el pretensado. */
  fciMPa: number;
  /** Resistencia del hormigón vertido in situ (carpeta). */
  fcInSituMPa: number;
  densidadKgM3: number;

  /** Resistencia a tracción del acero activo (Y1860S7: 1860 MPa). */
  fpuMPa: number;
  epMPa: number;
  areaToronMm2: number;
  /** Fuerza de tesado por torón, en kN. */
  fuerzaPorToronKN: number;

  fyPasivaMPa: number;
  diametroPasivaMm: number;
  cantidadPasiva: number;

  luzM: number;
  simple: SeccionPretensado;
  compuesta: SeccionPretensado;
  /** Recubrimiento mecánico de la armadura pasiva. */
  recMecPasivaM: number;
  /** Recubrimiento mecánico del pretensado inferior. */
  recMecPretensadoM: number;

  /** Cargas repartidas, en kN/m. */
  cargaMuertaKNm: number;
  sobrecargaKNm: number;
  cargaEvKNm: number;

  toronesInf: number;
  toronesSup: number;
  /** Fracción estimada de pérdidas instantáneas (0,15 = 15 %). */
  perdidasInstantaneas: number;
  /** Fracción estimada de pérdidas diferidas. */
  perdidasDiferidas: number;

  /** Coeficientes de pérdidas. Los valores por defecto son de pieza pretesada. */
  kes?: number;
  kcir?: number;
  ksh?: number;
  kcr?: number;
  /** Kre y J dependen del tipo de cordón; 35 MPa y 0,04 son de baja relajación. */
  kre?: number;
  j?: number;
  humedadRelativa: number;

  /** Coeficiente de simultaneidad de la sobrecarga para la flecha activa. */
  psiSobrecarga?: number;
}

/**
 * Estado tensional de la sección en un instante y una posición concretos.
 *
 * Se agrupan las dos fibras en lugar de listarlas sueltas porque en pretensado
 * se leen juntas: el diagrama de tensiones es una recta entre ellas, y lo que
 * interesa es que ninguno de los dos extremos se salga de la banda admisible.
 * No se presupone cuál está traccionada —eso depende de la etapa— así que a
 * cada fibra se le aplican los dos límites.
 */
export interface SituacionTension {
  nombre: string;
  /** Momento actuante en esta situación, en kN·m. */
  momentoKNm: number;
  /** Fuerza de pretensado vigente, en kN. */
  fuerzaKN: number;
  sigmaSupMPa: number;
  sigmaInfMPa: number;
  /** Límite de tracción, positivo. */
  admisibleTraccionMPa: number;
  /** Límite de compresión, negativo. */
  admisibleCompresionMPa: number;
  verificaSup: boolean;
  verificaInf: boolean;
  verifica: boolean;
  articulo: string;
}

export interface ResultadoPretensado {
  propiedades: {
    ecMPa: number;
    eciMPa: number;
    /** Módulo resistente de la fibra inferior de la sección simple. */
    sxInfSimpleM3: number;
    sxSupSimpleM3: number;
    sxInfCompuestaM3: number;
    sxSupCompuestaM3: number;
    /** Excentricidad del pretensado respecto del baricentro de la sección simple. */
    excentricidadM: number;
    dpM: number;
    dsM: number;
    apRealMm2: number;
  };
  cargas: {
    pesoPropioKNm: number;
    pesoPropioMasCarpetaKNm: number;
    momentoPesoPropioKNm: number;
    momentoLargaDuracionKNm: number;
    momentoUltimoKNm: number;
  };
  /** Fuerza de pretensado inicial y final, en kN. */
  fuerzas: { poKN: number; piKN: number; pfKN: number };
  tensiones: SituacionTension[];
  armaduraActiva: {
    apRequeridoPermanenteMm2: number;
    apRequeridoTemporalMm2: number;
    apMinimoMm2: number;
    apRealMm2: number;
    verifica: boolean;
  };
  flexion: {
    cuantiaPretensado: number;
    fpsMPa: number;
    aM: number;
    cM: number;
    /** Deformación neta de tracción. Por encima de 0,005 la sección es dúctil. */
    deformacionNeta: number;
    controladaPorTraccion: boolean;
    mnKNm: number;
    /** φ·Mn con φ = 0,9 para sección controlada por tracción. */
    momentoAdmisibleKNm: number;
    verifica: boolean;
    aprovechamiento: number;
  };
  cuantiaMinima: {
    /** Módulo de rotura, art. 19.2.3. */
    frMPa: number;
    mcrKNm: number;
    verifica: boolean;
    aprovechamiento: number;
  };
  perdidas: {
    esMPa: number;
    shMPa: number;
    crMPa: number;
    reMPa: number;
    totalMPa: number;
    tensionEfectivaMPa: number;
    tensionTrasTesadoMPa: number;
    tensionAdmisibleMPa: number;
    verifica: boolean;
  };
  deformaciones: {
    instantaneaMm: number;
    activaMm: number;
    totalMm: number;
    limiteInstantaneaMm: number;
    limiteActivaMm: number;
    limiteTotalMm: number;
    verifica: boolean;
  };
}

/** Módulo de elasticidad del hormigón, art. 19.2.2: Ec = 4700·√f'c. */
export function moduloElasticidad(fcMPa: number) {
  return 4700 * Math.sqrt(fcMPa);
}

/** Módulo de rotura, art. 19.2.3: fr = 0,62·λ·√f'c. */
export function moduloRotura(fcMPa: number) {
  return 0.62 * Math.sqrt(fcMPa);
}

/** β1 del bloque rectangular de compresiones, art. 22.2.2.4.3. */
export function beta1(fcMPa: number) {
  if (fcMPa <= 28) return 0.85;
  return Math.max(0.85 - (0.05 * (fcMPa - 28)) / 7, 0.65);
}

export function calcularPretensado(datos: DatosPretensado): ResultadoPretensado {
  const {
    fcPremoldeadoMPa: fc,
    fciMPa: fci,
    fcInSituMPa: fcSitu,
    fpuMPa: fpu,
    epMPa: ep,
    luzM: luz,
    simple,
    compuesta,
    perdidasInstantaneas: pInst,
    perdidasDiferidas: pDif,
  } = datos;

  const kes = datos.kes ?? 1;
  const kcir = datos.kcir ?? 0.9;
  const ksh = datos.ksh ?? 1;
  const kcr = datos.kcr ?? 2;
  const kre = datos.kre ?? 35;
  const j = datos.j ?? 0.04;
  const psi = datos.psiSobrecarga ?? 0.3;

  const fpy = 0.9 * fpu;
  const ecMPa = moduloElasticidad(fc);
  const eciMPa = moduloElasticidad(fci);

  // --- Geometría derivada ---------------------------------------------------
  const ySupSimple = simple.hM - simple.ygM;
  const ySupCompuesta = compuesta.hM - compuesta.ygM;
  const sxInfSimpleM3 = simple.iM4 / simple.ygM;
  const sxSupSimpleM3 = simple.iM4 / ySupSimple;
  const sxInfCompuestaM3 = compuesta.iM4 / compuesta.ygM;
  const sxSupCompuestaM3 = compuesta.iM4 / ySupCompuesta;

  /*
   * La excentricidad se mide desde el baricentro de la sección simple, que es
   * donde actúa el pretensado. Las planillas usaban este valor para las
   * tensiones pero uno distinto —medido desde la media altura— para el momento
   * de fisuración. En una sección no simétrica los dos no coinciden: en la viga
   * daban 0,156 m y 0,175 m. Acá hay uno solo.
   */
  const excentricidadM = simple.ygM - datos.recMecPretensadoM;
  const dpM = compuesta.hM - datos.recMecPretensadoM;
  const dsM = compuesta.hM - datos.recMecPasivaM;

  const apRealMm2 = datos.toronesInf * datos.areaToronMm2;

  // --- Cargas ---------------------------------------------------------------
  // El peso propio sale del área por la densidad; /100 pasa de kg/m a kN/m.
  const pesoPropioKNm = (simple.areaM2 * datos.densidadKgM3) / 100;
  const pesoPropioMasCarpetaKNm = (compuesta.areaM2 * datos.densidadKgM3) / 100;

  const momento = (qKNm: number) => (qKNm * luz ** 2) / 8;
  const momentoPesoPropioKNm = momento(pesoPropioKNm);
  const momentoPpMasCarpeta = momento(pesoPropioMasCarpetaKNm);
  const momentoMuerta = momento(datos.cargaMuertaKNm);
  const momentoSobrecarga = momento(datos.sobrecargaKNm);
  const momentoEv = momento(datos.cargaEvKNm);

  const momentoLargaDuracionKNm = momentoPpMasCarpeta + momentoMuerta + momentoSobrecarga;
  const momentoUltimoKNm =
    1.2 * (momentoPpMasCarpeta + momentoMuerta) + 1.6 * momentoSobrecarga + momentoEv;

  // --- Fuerzas de pretensado ------------------------------------------------
  const poKN = datos.fuerzaPorToronKN * datos.toronesInf;
  const piKN = poKN * (1 - pInst);
  const pfKN = poKN * (1 - pInst - pDif);

  // --- Tensiones en servicio ------------------------------------------------
  /*
   * Convenio: tracción positiva. El pretensado comprime toda la sección (−P/A) y
   * su excentricidad tracciona arriba y comprime abajo.
   */
  const tensionPorPretensado = (fuerzaKN: number, fibra: "sup" | "inf") => {
    const brazo = fibra === "sup" ? ySupSimple : -simple.ygM;
    return (fuerzaKN * (-1 / simple.areaM2 + (excentricidadM / simple.iM4) * brazo)) / 1000;
  };

  const tensionPorMomento = (momentoKNm: number, sxM3: number, fibra: "sup" | "inf") =>
    ((fibra === "sup" ? -1 : 1) * momentoKNm) / sxM3 / 1000;

  const situaciones: Omit<
    SituacionTension,
    "verificaSup" | "verificaInf" | "verifica"
  >[] = [
    {
      nombre: "Transferencia · apoyo",
      momentoKNm: 0,
      fuerzaKN: piKN,
      sigmaSupMPa: tensionPorPretensado(piKN, "sup"),
      sigmaInfMPa: tensionPorPretensado(piKN, "inf"),
      admisibleTraccionMPa: 0.5 * Math.sqrt(fci),
      // En el extremo la norma admite más compresión que en el vano.
      admisibleCompresionMPa: -0.7 * fci,
      articulo: "24.5.3",
    },
    {
      nombre: "Transferencia · centro de vano",
      momentoKNm: momentoPesoPropioKNm,
      fuerzaKN: piKN,
      sigmaSupMPa:
        tensionPorPretensado(piKN, "sup") +
        tensionPorMomento(momentoPesoPropioKNm, sxSupSimpleM3, "sup"),
      sigmaInfMPa:
        tensionPorPretensado(piKN, "inf") +
        tensionPorMomento(momentoPesoPropioKNm, sxInfSimpleM3, "inf"),
      admisibleTraccionMPa: 0.5 * Math.sqrt(fci),
      admisibleCompresionMPa: -0.6 * fci,
      articulo: "24.5.3",
    },
    {
      nombre: "Servicio · centro de vano, larga duración",
      momentoKNm: momentoLargaDuracionKNm,
      fuerzaKN: pfKN,
      sigmaSupMPa:
        tensionPorPretensado(pfKN, "sup") +
        tensionPorMomento(momentoLargaDuracionKNm, sxSupCompuestaM3, "sup"),
      sigmaInfMPa:
        tensionPorPretensado(pfKN, "inf") +
        tensionPorMomento(momentoLargaDuracionKNm, sxInfCompuestaM3, "inf"),
      admisibleTraccionMPa: 0.62 * Math.sqrt(fc),
      admisibleCompresionMPa: -0.6 * fcSitu,
      articulo: "24.5.2 (clase U)",
    },
  ];

  /*
   * A cada fibra se le aplican los dos límites, sin presuponer cuál está
   * traccionada: en transferencia se tracciona arriba y en servicio abajo, y con
   * poco pretensado puede no traccionarse ninguna.
   */
  const dentroDeBanda = (
    sigma: number,
    traccion: number,
    compresion: number
  ) => sigma <= traccion && sigma >= compresion;

  const tensiones: SituacionTension[] = situaciones.map((s) => {
    const verificaSup = dentroDeBanda(s.sigmaSupMPa, s.admisibleTraccionMPa, s.admisibleCompresionMPa);
    const verificaInf = dentroDeBanda(s.sigmaInfMPa, s.admisibleTraccionMPa, s.admisibleCompresionMPa);
    return { ...s, verificaSup, verificaInf, verifica: verificaSup && verificaInf };
  });

  // --- Armadura activa necesaria, tabla 20.3.2.5.1 --------------------------
  const sigmaPermanente = Math.min(0.74 * fpu, 0.82 * fpy, 0.7 * fpu);
  const sigmaTemporal = Math.min(0.8 * fpu, 0.94 * fpy);
  const apRequeridoPermanenteMm2 = ((piKN / sigmaPermanente) * 1e6) / 1000;
  const apRequeridoTemporalMm2 = ((poKN / sigmaTemporal) * 1e6) / 1000;
  const apMinimoMm2 = Math.max(apRequeridoPermanenteMm2, apRequeridoTemporalMm2);

  // --- Flexión, art. 20.3.2.3 -----------------------------------------------
  /*
   * ρp = Ap/(b·dp), art. 20.3.2.3.1. Las dos planillas traían acá una expresión
   * con números fijos —Ap/((0,2072 − 9·0,0091)·10⁶)— que no depende de la
   * sección: daba la misma área para la viga y para la losa. Sobrestimaba ρp
   * más del doble, lo que baja fps y por lo tanto Mn: iba del lado seguro, pero
   * no era el valor de la norma.
   */
  const cuantiaPretensado = apRealMm2 / (compuesta.bM * dpM * 1e6);
  const gammaP = 0.28; // cordones de baja relajación, art. 20.3.2.3.1
  const b1 = beta1(fcSitu);
  const fpsMPa = fpu * (1 - (gammaP / b1) * ((cuantiaPretensado * fpu) / fcSitu));

  const traccionActivaKN = (fpsMPa * apRealMm2) / 1000;
  const areaPasivaMm2 =
    ((datos.diametroPasivaMm / 1000) ** 2 * Math.PI * datos.cantidadPasiva) / 4 * 1e6;
  const traccionPasivaKN = (areaPasivaMm2 * datos.fyPasivaMPa) / 1000;

  const aM = (traccionActivaKN + traccionPasivaKN) / (0.85 * fcSitu * 1000 * compuesta.bM);
  const cM = aM / b1;
  const deformacionNeta = (0.003 * (dpM - cM)) / cM;
  const controladaPorTraccion = deformacionNeta >= 0.005;

  const mnKNm =
    traccionActivaKN * (dpM - aM / 2) + traccionPasivaKN * (dsM - aM / 2);
  // φ = 0,9 solo si la sección es dúctil; si no, la norma lo reduce.
  const phi = controladaPorTraccion ? 0.9 : 0.65 + 0.25 * ((deformacionNeta - 0.002) / 0.003);
  const momentoAdmisibleKNm = phi * mnKNm;

  // --- Cuantía mínima, art. 7.6.2 / 9.6.2 -----------------------------------
  /*
   * Mcr = (fr + P/A + P·e/S)·S. Las planillas omitían el módulo de rotura y se
   * quedaban solo con el aporte del pretensado, lo que **subestima** Mcr y por
   * lo tanto hace pasar la comprobación con más holgura de la que corresponde.
   */
  const frMPa = moduloRotura(fc);
  // Todo en kPa: fr pasa de MPa a kPa y las fuerzas ya vienen en kN/m².
  const tensionFisuracionKPa =
    frMPa * 1000 + piKN / simple.areaM2 + (piKN * excentricidadM) / sxInfSimpleM3;
  const mcrKNm = tensionFisuracionKPa * sxInfSimpleM3;
  const cuantiaMinimaVerifica = 1.2 * mcrKNm <= momentoAdmisibleKNm;

  // --- Pérdidas -------------------------------------------------------------
  const ppiKN = 1.07 * poKN;
  const fcpi =
    (ppiKN / simple.areaM2 + (ppiKN * excentricidadM ** 2) / simple.iM4) / 1000;
  const fg = ((momentoPesoPropioKNm * excentricidadM) / simple.iM4) / 1000;
  const fcir = kcir * fcpi - fg;
  const esMPa = (kes * ep * fcir) / eciMPa;

  const volumenSuperficie = simple.areaM2 / simple.perimetroM;
  const shMPa =
    8.2e-6 * ksh * ep * (1 - 0.024 * volumenSuperficie) * (100 - datos.humedadRelativa);

  /*
   * La fluencia la produce la carga sostenida, no la total: entra el momento de
   * carga muerta sobreimpuesta y no la sobrecarga de uso.
   */
  const fcds = ((momentoMuerta * excentricidadM) / simple.iM4) / 1000;
  const crMPa = kcr * (fcir - fcds) * (ep / ecMPa);

  const fpi = (ppiKN / apRealMm2) * 1000;
  const cRelajacion = fpi / fpu > 0.7 ? 0.75 + 5 * (fpi / fpu - 0.7) : (fpi / fpu) / 0.85;
  const reMPa = kre - j * (esMPa + shMPa + crMPa) * cRelajacion;

  const totalMPa = esMPa + shMPa + crMPa + reMPa;
  const tensionEfectivaMPa = (poKN / apRealMm2) * 1000;
  const tensionTrasTesadoMPa = tensionEfectivaMPa + totalMPa;

  // --- Deformaciones --------------------------------------------------------
  /*
   * Coeficientes de fluencia ξ de la tabla 24.2.4.1.3, tomados en los instantes
   * de la historia de cargas de las planillas: montaje a las 2 semanas (ξ=0,5),
   * entrada en carga al mes (ξ=0,7) y largo plazo (ξ=2).
   */
  const dXiMontaje = 0.7 - 0.5;
  const dXiLargoPlazo = 2 - 0.7;

  const flecha = (qKNm: number, eMPa: number, iM4: number) =>
    ((5 / 384) * qKNm * (luz * 1000) ** 4) / eMPa / (iM4 * 1000 ** 4);

  const cargaCmMasSc = datos.cargaMuertaKNm + datos.sobrecargaKNm;
  const cargaCmMasPsiSc = datos.cargaMuertaKNm + psi * datos.sobrecargaKNm;
  // Carga equivalente ascendente del pretensado en trazado recto con excentricidad.
  const qEquivalenteFinal = (8 * pfKN * excentricidadM) / luz ** 2;
  const qEquivalenteInicial = (8 * piKN * excentricidadM) / luz ** 2;

  const fPpInst = flecha(pesoPropioMasCarpetaKNm, eciMPa, simple.iM4);
  const fPpDif1 = fPpInst * dXiMontaje;
  const fPpDif2 = flecha(pesoPropioMasCarpetaKNm, ecMPa, compuesta.iM4) * dXiLargoPlazo;

  const fCmScInst = flecha(cargaCmMasSc, ecMPa, compuesta.iM4);

  const fCmPsiScInst = flecha(cargaCmMasPsiSc, ecMPa, compuesta.iM4);
  const fCmPsiScDif2 = fCmPsiScInst * dXiLargoPlazo;

  const fPretFinalDif1 = -flecha(qEquivalenteFinal, eciMPa, simple.iM4) * dXiMontaje;
  const fPretFinalDif2 = -flecha(qEquivalenteFinal, ecMPa, compuesta.iM4) * dXiLargoPlazo;
  const fPretInicialInst = -flecha(qEquivalenteInicial, eciMPa, simple.iM4);

  const instantaneaMm = fPpInst + fPpDif1 + fCmScInst + fPretInicialInst + fPretFinalDif1;
  const activaMm = fPpDif2 + fCmPsiScDif2 + fPretFinalDif2;
  const totalMm =
    fPpInst + fPpDif1 + fPpDif2 +
    fCmPsiScInst + fCmPsiScDif2 +
    fPretFinalDif1 + fPretFinalDif2 +
    fPretInicialInst;

  const limiteInstantaneaMm = (luz / 360) * 1000;
  const limiteActivaMm = (luz / 240) * 1000;
  const limiteTotalMm = (luz / 250) * 1000;

  return {
    propiedades: {
      ecMPa,
      eciMPa,
      sxInfSimpleM3,
      sxSupSimpleM3,
      sxInfCompuestaM3,
      sxSupCompuestaM3,
      excentricidadM,
      dpM,
      dsM,
      apRealMm2,
    },
    cargas: {
      pesoPropioKNm,
      pesoPropioMasCarpetaKNm,
      momentoPesoPropioKNm,
      momentoLargaDuracionKNm,
      momentoUltimoKNm,
    },
    fuerzas: { poKN, piKN, pfKN },
    tensiones,
    armaduraActiva: {
      apRequeridoPermanenteMm2,
      apRequeridoTemporalMm2,
      apMinimoMm2,
      apRealMm2,
      verifica: apRealMm2 >= apMinimoMm2,
    },
    flexion: {
      cuantiaPretensado,
      fpsMPa,
      aM,
      cM,
      deformacionNeta,
      controladaPorTraccion,
      mnKNm,
      momentoAdmisibleKNm,
      verifica: momentoUltimoKNm <= momentoAdmisibleKNm,
      aprovechamiento: momentoUltimoKNm / momentoAdmisibleKNm,
    },
    cuantiaMinima: {
      frMPa,
      mcrKNm,
      verifica: cuantiaMinimaVerifica,
      aprovechamiento: (1.2 * mcrKNm) / momentoAdmisibleKNm,
    },
    perdidas: {
      esMPa,
      shMPa,
      crMPa,
      reMPa,
      totalMPa,
      tensionEfectivaMPa,
      tensionTrasTesadoMPa,
      tensionAdmisibleMPa: sigmaTemporal,
      verifica: tensionTrasTesadoMPa <= sigmaTemporal,
    },
    deformaciones: {
      instantaneaMm,
      activaMm,
      totalMm,
      limiteInstantaneaMm,
      limiteActivaMm,
      limiteTotalMm,
      verifica:
        instantaneaMm <= limiteInstantaneaMm &&
        activaMm <= limiteActivaMm &&
        totalMm <= limiteTotalMm,
    },
  };
}
