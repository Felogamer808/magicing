# Vuelca un .xlsx a texto plano sin dependencias: un .xlsx es un zip de XML.
# Saca por cada hoja las celdas con contenido, mostrando la fórmula cuando existe
# y el valor calculado entre paréntesis. Sirve para leer una planilla completa
# gastando una fracción de lo que costaría abrirla como imagen.
param(
  [Parameter(Mandatory = $true)][string]$Xlsx,
  [Parameter(Mandatory = $true)][string]$Salida
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$tmp = Join-Path $env:TEMP ("xlsxdump_" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
[System.IO.Compression.ZipFile]::ExtractToDirectory($Xlsx, $tmp)

# Cadenas compartidas: Excel guarda el texto una sola vez y lo referencia por índice.
$compartidas = @()
$rutaSS = Join-Path $tmp 'xl\sharedStrings.xml'
if (Test-Path $rutaSS) {
  $ssXml = [xml](Get-Content $rutaSS -Raw -Encoding UTF8)
  foreach ($si in $ssXml.sst.si) {
    if ($si.t -is [string]) { $compartidas += $si.t }
    elseif ($si.t.'#text') { $compartidas += $si.t.'#text' }
    else { $compartidas += (($si.r | ForEach-Object { $_.t }) -join '') }
  }
}

# Nombre visible de cada hoja -> archivo sheetN.xml, vía las relaciones del workbook.
$wbXml = [xml](Get-Content (Join-Path $tmp 'xl\workbook.xml') -Raw -Encoding UTF8)
$relXml = [xml](Get-Content (Join-Path $tmp 'xl\_rels\workbook.xml.rels') -Raw -Encoding UTF8)
$rels = @{}
foreach ($r in $relXml.Relationships.Relationship) { $rels[$r.Id] = $r.Target }

$sb = [System.Text.StringBuilder]::new()
$n = 0
foreach ($hoja in $wbXml.workbook.sheets.sheet) {
  $n++
  $rid = $hoja.id
  if (-not $rid) { $rid = $hoja.GetAttribute('r:id') }
  $destino = $rels[$rid] -replace '^/xl/', '' -replace '^xl/', ''
  $rutaHoja = Join-Path $tmp (Join-Path 'xl' $destino)
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("=== HOJA $n : $($hoja.name) ===")
  if (-not (Test-Path $rutaHoja)) { [void]$sb.AppendLine("(no se encontró $destino)"); continue }

  $shXml = [xml](Get-Content $rutaHoja -Raw -Encoding UTF8)
  foreach ($fila in $shXml.worksheet.sheetData.row) {
    $partes = @()
    foreach ($c in $fila.c) {
      $ref = $c.r
      $tipo = $c.t
      $valor = $c.v
      $formula = $c.f
      if ($formula -and $formula -isnot [string]) { $formula = $formula.'#text' }

      if ($tipo -eq 's' -and $valor -ne $null) {
        $texto = $compartidas[[int]$valor]
      } elseif ($tipo -eq 'inlineStr') {
        $texto = $c.is.t
      } else {
        $texto = $valor
      }

      if ($formula) {
        $partes += "$ref{=$formula}" + $(if ($texto) { " -> $texto" } else { "" })
      } elseif ($texto -ne $null -and "$texto".Trim() -ne '') {
        $partes += "$ref=$texto"
      }
    }
    if ($partes.Count -gt 0) { [void]$sb.AppendLine(($partes -join ' | ')) }
  }
}

Set-Content -Path $Salida -Value $sb.ToString() -Encoding utf8
Remove-Item $tmp -Recurse -Force
"Escrito: $Salida ({0:N0} caracteres)" -f $sb.Length
