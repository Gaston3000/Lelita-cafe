Param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [int]$Quality = 82,
  [switch]$Overwrite
)

# Genera un .webp junto a cada .jpg/.jpeg/.png/.JPG en Fotos/.
# Por defecto NO pisa webp ya existentes (usa -Overwrite para forzar).

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$photosDir = Join-Path $Root 'Fotos'
if (-not (Test-Path -LiteralPath $photosDir)) {
  throw "No se encontro la carpeta: $photosDir"
}

$imDir = Get-ChildItem 'C:\Program Files' -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'ImageMagick-*' } |
  Sort-Object Name -Descending |
  Select-Object -First 1
if (-not $imDir) { throw 'ImageMagick no encontrado.' }
$magickExe = Join-Path $imDir.FullName 'magick.exe'

$files = Get-ChildItem -LiteralPath $photosDir -Recurse -File |
  Where-Object { $_.Extension -match '^\.(jpe?g|png)$' }

$total = 0
$skipped = 0
$errors = 0
$bytesSrc = 0L
$bytesDst = 0L

foreach ($file in $files) {
  $webp = [System.IO.Path]::ChangeExtension($file.FullName, '.webp')
  if ((Test-Path -LiteralPath $webp) -and -not $Overwrite) {
    $skipped++
    continue
  }
  try {
    & $magickExe $file.FullName -strip -quality $Quality -define webp:method=6 $webp
    if (Test-Path -LiteralPath $webp) {
      $total++
      $bytesSrc += $file.Length
      $bytesDst += (Get-Item -LiteralPath $webp).Length
    }
  } catch {
    $errors++
    Write-Warning "No se pudo convertir: $($file.FullName). $_"
  }
}

$saved = $bytesSrc - $bytesDst
Write-Host ("Convertidos={0} Saltados={1} Errores={2}" -f $total, $skipped, $errors)
if ($bytesSrc -gt 0) {
  Write-Host ("Origen={0:N2} MB  WebP={1:N2} MB  Ahorro={2:N2} MB ({3:N1}%)" -f `
    ($bytesSrc/1MB), ($bytesDst/1MB), ($saved/1MB), (($saved/$bytesSrc)*100))
}
