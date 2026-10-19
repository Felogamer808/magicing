# MagicIng · CAD → Revit: coloca cabezales, vigas y pilotes a partir del
# archivo "-revit.json" que baja la página CAD → Revit de MagicIng.
#
# Revit 2026, Dynamo 3.x, motor Python 3 (CPython3 o PythonNet3).
#
# Entradas:
#   IN[0]  ruta del .json. Vacío: el "-revit.json" más reciente de Descargas.
#   IN[1]  nombre del nivel donde se colocan (la cara superior común es 0).
#
# Qué hace y qué no:
#   - Usa las familias de la oficina; si falta un tipo, lo crea duplicando uno
#     de la misma familia y le pone las medidas.
#   - Coloca sobre el CAD vinculado en el modelo que se llama como el DXF
#     exportado, con su corrimiento y su giro. Si no está, origen a origen.
#   - Todo en una transacción: si algo falla, Revit vuelve atrás entero.
#   - Si ya hay elementos creados por este script, no hace nada y avisa: no
#     duplica ni borra.

import clr
import glob
import json
import math
import os
import traceback

clr.AddReference('RevitServices')
from RevitServices.Persistence import DocumentManager
from RevitServices.Transactions import TransactionManager
clr.AddReference('RevitAPI')
from Autodesk.Revit.DB import *
from Autodesk.Revit.DB.Structure import StructuralType, StructuralFramingUtils
clr.AddReference('System')
from System import Environment

doc = DocumentManager.Instance.CurrentDBDocument

FAMILIA_CABEZAL = "Cimentacion-Rectangular"
FAMILIA_VIGA = "Solid Wall - Rectangular Beam"
FAMILIA_PILOTE = "M_Pile-Steel Pipe"
# Va en "Comments" de todo lo que se crea, para reconocerlo después.
MARCA = "MagicIng CAD-Revit"


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def en_pies(metros):
    return UnitUtils.ConvertToInternalUnits(metros, UnitTypeId.Meters)


def parametro(elemento, nombre):
    # Puede haber dos con el mismo nombre: en Cimentacion-Rectangular, "Length"
    # es a la vez el de la familia (editable) y el interno de Revit para
    # fundaciones (sólo lectura). LookupParameter devuelve cualquiera de los
    # dos, así que se busca el editable entre todos.
    for p in elemento.GetParameters(nombre):
        if not p.IsReadOnly:
            return p
    raise Exception("El parámetro '%s' no existe o es de sólo lectura en '%s'." % (nombre, nombre_tipo(elemento) if isinstance(elemento, FamilySymbol) else elemento.Name))


def es_medida(p):
    """True si Revit guarda el valor en sus unidades internas (pies): Length,
    pero también Pipe Size, Section Dimension… como el Diameter y el Depth de
    M_Pile-Steel Pipe. False si es un número suelto, como los #Ancho, #Altura…
    de la oficina, que ya están en mm."""
    tipo_dato = p.Definition.GetDataType()
    if tipo_dato.TypeId == SpecTypeId.Number.TypeId:
        return False
    return UnitUtils.IsMeasurableSpec(tipo_dato)


def poner_mm(elemento, nombre, mm):
    """Escribe una medida en mm, sea el parámetro una medida o un número."""
    p = parametro(elemento, nombre)
    if es_medida(p):
        p.Set(en_pies(mm / 1000.0))
    else:
        p.Set(float(mm))


def leer_mm(elemento, nombre):
    p = elemento.LookupParameter(nombre)
    if p is None:
        return None
    if es_medida(p):
        return UnitUtils.ConvertFromInternalUnits(p.AsDouble(), UnitTypeId.Millimeters)
    return p.AsDouble()


def nombre_tipo(t):
    p = t.get_Parameter(BuiltInParameter.SYMBOL_NAME_PARAM)
    return p.AsString() if p is not None else ""


def tipos_de(familia):
    tipos = [s for s in FilteredElementCollector(doc).OfClass(FamilySymbol).ToElements() if s.FamilyName == familia]
    if not tipos:
        raise Exception("No está cargada la familia '%s' en el modelo." % familia)
    return tipos


def activar(t):
    if not t.IsActive:
        t.Activate()
        doc.Regenerate()
    return t


def marcar(elemento, nombre=None):
    elemento.get_Parameter(BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS).Set(MARCA)
    if nombre:
        elemento.get_Parameter(BuiltInParameter.ALL_MODEL_MARK).Set(nombre)


def archivo_reciente():
    descargas = os.path.join(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads")
    candidatos = glob.glob(os.path.join(descargas, "*-revit.json"))
    if not candidatos:
        raise Exception("No se indicó archivo y no hay ningún '-revit.json' en " + descargas)
    return max(candidatos, key=os.path.getmtime)


def ubicar_cad(nombre_archivo):
    """El CAD vinculado o importado que se llama como el DXF exportado (sin
    mirar la extensión ni mayúsculas): (transformación, descripción) o None.
    Si hay varios, el primero que no es de una sola vista."""
    base = os.path.splitext(os.path.basename(nombre_archivo))[0].lower()
    if not base:
        return None
    candidatos = []
    for ci in FilteredElementCollector(doc).OfClass(ImportInstance).ToElements():
        tipo = doc.GetElement(ci.GetTypeId())
        nombre = nombre_tipo(tipo) if tipo is not None else ""
        if os.path.splitext(nombre)[0].lower() == base:
            candidatos.append((ci, nombre))
    if not candidatos:
        return None
    candidatos.sort(key=lambda x: x[0].ViewSpecific)
    ci, nombre = candidatos[0]
    return ci.GetTotalTransform(), "%s (%s)" % (nombre, "vinculado" if ci.IsLinked else "importado")


def cota_superior(e):
    """Cara superior real, m sobre el origen interno."""
    caja = e.get_BoundingBox(None)
    return UnitUtils.ConvertFromInternalUnits(caja.Max.Z, UnitTypeId.Meters) if caja else None


# ---------------------------------------------------------------------------
# Tipos: el que existe, o uno nuevo duplicando uno de la familia
# ---------------------------------------------------------------------------

creados = []


def tipo_por_nombre(familia, nombre, medidas_mm):
    tipos = tipos_de(familia)
    for t in tipos:
        if nombre_tipo(t) == nombre:
            return activar(t)
    nuevo = tipos[0].Duplicate(nombre)
    for param, mm in medidas_mm:
        poner_mm(nuevo, param, mm)
    creados.append("%s: %s" % (familia, nombre))
    return activar(nuevo)


def tipo_pilote(diametro_mm, largo_mm, avisos):
    tipos = tipos_de(FAMILIA_PILOTE)
    nombre = u"⌀%d" % diametro_mm
    # Primero por nombre (la convención de la oficina), después por diámetro.
    elegido = None
    for t in tipos:
        if nombre_tipo(t) == nombre:
            elegido = t
            break
    if elegido is None:
        for t in tipos:
            d = leer_mm(t, "Diameter")
            if d is not None and abs(d - diametro_mm) < 0.5:
                elegido = t
                break
    if elegido is None:
        elegido = tipos[0].Duplicate(nombre)
        poner_mm(elegido, "Diameter", diametro_mm)
        creados.append(u"%s: ⌀%d" % (FAMILIA_PILOTE, diametro_mm))
    # El largo es de tipo: cambia todos los pilotes de ese diámetro del proyecto.
    if abs((leer_mm(elegido, "Depth") or 0) - largo_mm) > 0.5:
        poner_mm(elegido, "Depth", largo_mm)
        avisos.append(u"Tipo %s: Depth = %d mm (es de tipo: vale para todos los pilotes de ese diámetro)." % (nombre_tipo(elegido), largo_mm))
    return activar(elegido)


# ---------------------------------------------------------------------------

try:
    ruta = IN[0] if len(IN) > 0 and IN[0] else archivo_reciente()
    nombre_nivel = IN[1] if len(IN) > 1 and IN[1] else "PB"

    with open(ruta, "r", encoding="utf-8") as f:
        datos = json.load(f)
    if datos.get("formato") != "magicing-cad-revit":
        raise Exception("El archivo no es una exportación de CAD → Revit de MagicIng: " + ruta)
    if datos.get("version", 0) > 1:
        raise Exception("El archivo es de una versión más nueva de MagicIng. Actualizá el script.")

    niveles = [n for n in FilteredElementCollector(doc).OfClass(Level).ToElements() if n.Name == nombre_nivel]
    if not niveles:
        raise Exception("No existe el nivel '%s' en el modelo." % nombre_nivel)
    nivel = niveles[0]
    # Cota del nivel respecto del origen interno, que es donde viven las
    # coordenadas de la API. Level.Elevation es relativa al Project Base Point
    # (en FUNDACIONES MAGICING, PB está 1,02 m sobre el origen interno).
    z_nivel = nivel.ProjectElevation

    # Dónde está el CAD en el modelo: el vinculado o importado con el mismo
    # nombre que el DXF exportado. Las piezas se ponen sobre él, con su
    # corrimiento y su giro. Si no está, origen a origen.
    cad = ubicar_cad(datos.get("archivo", ""))
    transformar = cad[0] if cad else Transform.Identity
    giro_cad = math.atan2(transformar.BasisX.Y, transformar.BasisX.X)

    def en_modelo(xy, z):
        q = transformar.OfPoint(XYZ(en_pies(xy[0]), en_pies(xy[1]), 0))
        return XYZ(q.X, q.Y, z)

    # Si ya se colocó, no se vuelve a colocar.
    ya = 0
    for cat in (BuiltInCategory.OST_StructuralFoundation, BuiltInCategory.OST_StructuralFraming):
        for e in FilteredElementCollector(doc).OfCategory(cat).WhereElementIsNotElementType().ToElements():
            c = e.get_Parameter(BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS)
            if c is not None and c.AsString() == MARCA:
                ya += 1
    if ya:
        OUT = ["No se hizo nada: ya hay %d elementos colocados por este script (Comments = '%s'). Borralos para volver a colocar." % (ya, MARCA)]
    else:
        avisos = []
        TransactionManager.Instance.ForceCloseTransaction()
        t = Transaction(doc, "MagicIng: colocar fundaciones")
        t.Start()
        try:
            # --- Cabezales ---------------------------------------------------
            ancho_en_x = None
            muestra = {}  # una pieza de cada clase, para comprobar alturas al final
            for c in datos["cabezales"]:
                a, b, h = [int(round(v * 1000)) for v in (c["a"], c["b"], c["canto"])]
                simbolo = tipo_por_nombre(FAMILIA_CABEZAL, "%s (%dx%dx%d)" % (c["nombre"], a, b, h), [("#Ancho", a), ("#Profundidad", h)])
                punto = en_modelo(c["centro"], z_nivel)
                inst = doc.Create.NewFamilyInstance(punto, simbolo, nivel, StructuralType.Footing)
                poner_mm(inst, "Length", b)
                parametro(inst, "Height Offset From Level").Set(en_pies(c["cotaSuperior"]))
                # "marca" viene numerada si el rótulo se repite (CT9-1, CT9-2…).
                marcar(inst, c.get("marca") or c["nombre"])
                if "cabezal" not in muestra:
                    muestra["cabezal"] = (c.get("marca") or c["nombre"], inst, c["cotaSuperior"])
                doc.Regenerate()
                caja = inst.get_BoundingBox(None)
                # Centrado: si el origen de la familia no está en el centro, se corre.
                # En Python 3 los XYZ no admiten + ni /: se usan sus métodos.
                centro_caja = caja.Min.Add(caja.Max).Divide(2.0)
                corrimiento = XYZ(punto.X - centro_caja.X, punto.Y - centro_caja.Y, 0)
                if corrimiento.GetLength() > en_pies(0.005):
                    ElementTransformUtils.MoveElement(doc, inst.Id, corrimiento)
                # En qué eje de la familia corre #Ancho: se mide en el primero, sin girar.
                if ancho_en_x is None and a != b:
                    dx = caja.Max.X - caja.Min.X
                    dy = caja.Max.Y - caja.Min.Y
                    ancho_en_x = abs(dx - en_pies(a / 1000.0)) <= abs(dy - en_pies(a / 1000.0))
                giro = math.radians(c["giroLadoA"]) + giro_cad - (0 if ancho_en_x in (None, True) else math.pi / 2)
                if abs(giro) > 1e-9:
                    ElementTransformUtils.RotateElement(doc, inst.Id, Line.CreateBound(punto, punto.Add(XYZ.BasisZ)), giro)

            # --- Vigas -------------------------------------------------------
            for v in datos["vigas"]:
                ancho, alto = int(round(v["ancho"] * 1000)), int(round(v["alto"] * 1000))
                simbolo = tipo_por_nombre(FAMILIA_VIGA, "%dx%d" % (ancho, alto), [("#Ancho", ancho), ("#Altura", alto)])
                # La línea ya va a la cota final (no sólo los offsets), así Revit
                # no tiene dos alturas que conciliar.
                z = z_nivel + en_pies(v["cotaSuperior"])
                linea = Line.CreateBound(en_modelo(v["inicio"], z), en_modelo(v["fin"], z))
                viga = doc.Create.NewFamilyInstance(linea, simbolo, nivel, StructuralType.Beam)
                # De cara a cara: que Revit no la estire ni la una en los extremos.
                StructuralFramingUtils.DisallowJoinAtEnd(viga, 0)
                StructuralFramingUtils.DisallowJoinAtEnd(viga, 1)
                for nombre in ("Start Level Offset", "End Level Offset"):
                    parametro(viga, nombre).Set(en_pies(v["cotaSuperior"]))
                marcar(viga, v.get("marca") or v["nombre"])
                if "viga" not in muestra:
                    muestra["viga"] = (v.get("marca") or v["nombre"], viga, v["cotaSuperior"])

            # --- Pilotes -----------------------------------------------------
            for p in datos["pilotes"]:
                simbolo = tipo_pilote(int(round(p["diametro"] * 1000)), int(round(p["largo"] * 1000)), avisos)
                punto = en_modelo(p["centro"], z_nivel)
                inst = doc.Create.NewFamilyInstance(punto, simbolo, nivel, StructuralType.Footing)
                parametro(inst, "Height Offset From Level").Set(en_pies(p["cotaCabeza"]))
                marcar(inst)

            t.Commit()

            # Comprobación: cara superior real contra la esperada, respecto del nivel.
            alturas = []
            for clase in ("cabezal", "viga"):
                if clase not in muestra:
                    continue
                marca, e, esperada = muestra[clase]
                real = cota_superior(e)
                if real is None:
                    continue
                real -= UnitUtils.ConvertFromInternalUnits(z_nivel, UnitTypeId.Meters)
                ok = abs(real - esperada) < 0.005
                alturas.append("Cara superior de %s %s: %.3f m respecto de %s (esperada %.3f)%s" % (
                    clase, marca, real, nombre_nivel, esperada, "" if ok else "  <-- NO COINCIDE"))
        except Exception:
            t.RollBack()
            raise

        OUT = [
            "Archivo: " + ruta,
            "Nivel: " + nombre_nivel,
            "Colocados: %d cabezales, %d vigas, %d pilotes." % (len(datos["cabezales"]), len(datos["vigas"]), len(datos["pilotes"])),
            "#Ancho del cabezal corre en " + ("X" if ancho_en_x in (None, True) else "Y") + " de la familia.",
            ("Ubicado sobre el CAD %s, giro %.4f grados." % (cad[1], math.degrees(giro_cad))) if cad else
            ("No hay en el modelo un CAD llamado '%s': se colocó origen a origen." % datos.get("archivo", "?")),
        ] + alturas + ["Tipo creado: " + c for c in creados] + avisos + ["Para revisar (de MagicIng): " + a for a in datos.get("avisos", [])]
except Exception as e:
    OUT = "ERROR: " + str(e) + "\n" + traceback.format_exc()
