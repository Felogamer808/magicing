/**
 * Arma el grafo de Dynamo que coloca las fundaciones en Revit a partir del
 * script de Python versionado en revit/colocar-fundaciones.py.
 *
 *   node scripts/armar-dyn.mjs
 *
 * El .dyn es un JSON con el código adentro: se genera, no se edita a mano.
 * Lleva dos entradas para Dynamo Player —el archivo -revit.json y el nivel—
 * conectadas al nodo de Python. Un test (lib/cad-revit/dynamo.test.ts)
 * verifica que el .dyn publicado lleve el código actual del .py.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const raiz = path.join(import.meta.dirname, "..");
const codigo = readFileSync(path.join(raiz, "revit", "colocar-fundaciones.py"), "utf8").replace(/\r\n/g, "\n").trim();

// Ids fijos (derivados de un nombre) para que regenerar no cambie el archivo sin motivo.
const id = (nombre) => createHash("md5").update("magicing-dyn:" + nombre).digest("hex");
const puerto = (nombre, descripcion) => ({
  Id: id(nombre),
  Name: nombre.startsWith("in") ? `IN[${nombre.slice(2)}]` : "",
  Description: descripcion,
  UsingDefaultValue: false,
  Level: 2,
  UseLevels: false,
  KeepListStructure: false,
});

const archivo = {
  ConcreteType: "CoreNodeModels.Input.Filename, CoreNodeModels",
  HintPath: "",
  InputValue: "",
  NodeType: "ExtensionNode",
  Id: id("nodo-archivo"),
  Inputs: [],
  Outputs: [{ ...puerto("out-archivo", "File Path"), Name: "" }],
  Replication: "Disabled",
  Description: "Archivo -revit.json bajado de MagicIng. Vacío: el más reciente de Descargas.",
};
const nivel = {
  ConcreteType: "CoreNodeModels.Input.StringInput, CoreNodeModels",
  NodeType: "StringInputNode",
  InputValue: "PB",
  Id: id("nodo-nivel"),
  Inputs: [],
  Outputs: [{ ...puerto("out-nivel", "String"), Name: "" }],
  Replication: "Disabled",
  Description: "Nivel donde se colocan las fundaciones.",
};
const python = {
  ConcreteType: "PythonNodeModels.PythonNode, PythonNodeModels",
  NodeType: "PythonScriptNode",
  Code: codigo,
  Engine: "CPython3",
  EngineName: "CPython3",
  VariableInputPorts: true,
  Id: id("nodo-python"),
  Inputs: [puerto("in0", "Archivo -revit.json"), puerto("in1", "Nivel")],
  Outputs: [{ ...puerto("out-python", "Resultado"), Name: "OUT" }],
  Replication: "Disabled",
  Description: "Coloca cabezales, vigas y pilotes.",
};

const grafo = {
  Uuid: id("grafo"),
  IsCustomNode: false,
  Description: "MagicIng · CAD → Revit: coloca cabezales, vigas y pilotes desde el archivo -revit.json.",
  Name: "MagicIng - Colocar fundaciones",
  ElementResolver: { ResolutionMap: {} },
  Inputs: [],
  Outputs: [],
  Nodes: [archivo, nivel, python],
  Connectors: [
    { Start: archivo.Outputs[0].Id, End: python.Inputs[0].Id, Id: id("conector-archivo"), IsHidden: "False" },
    { Start: nivel.Outputs[0].Id, End: python.Inputs[1].Id, Id: id("conector-nivel"), IsHidden: "False" },
  ],
  Dependencies: [],
  NodeLibraryDependencies: [],
  EnableLaceByDefault: true,
  Bindings: [],
  View: {
    Dynamo: { ScaleFactor: 1.0, HasRunWithoutCrash: false, IsVisibleInDynamoLibrary: true, Version: "3.0.0.0", RunType: "Manual", RunPeriod: "1000" },
    Camera: { Name: "Background Preview", EyeX: -17, EyeY: 24, EyeZ: 50, LookX: 12, LookY: -13, LookZ: -58, UpX: 0, UpY: 1, UpZ: 0 },
    NodeViews: [
      { Name: "Archivo de MagicIng", ShowGeometry: true, Id: archivo.Id, IsSetAsInput: true, IsSetAsOutput: false, Excluded: false, X: 0, Y: 0 },
      { Name: "Nivel", ShowGeometry: true, Id: nivel.Id, IsSetAsInput: true, IsSetAsOutput: false, Excluded: false, X: 0, Y: 160 },
      { Name: "Colocar fundaciones (MagicIng)", ShowGeometry: true, Id: python.Id, IsSetAsInput: false, IsSetAsOutput: true, Excluded: false, X: 420, Y: 60 },
    ],
    Annotations: [],
    X: 0,
    Y: 0,
    Zoom: 1,
  },
};

const destino = path.join(raiz, "public", "revit", "colocar-fundaciones-magicing.dyn");
mkdirSync(path.dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify(grafo, null, 2) + "\n", "utf8");
console.log("Escrito " + path.relative(raiz, destino));
