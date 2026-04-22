Param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Folder = 'Fotos/galeria-lleita'
)

# Genera el valor de data-gallery-files a partir de la carpeta de galeria real.
# Ordena por nombre y excluye .webp (usamos .jpg como fallback; el browser resuelve webp via <picture>).

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$dir = Join-Path $Root $Folder
if (-not (Test-Path -LiteralPath $dir)) { throw "No existe: $dir" }

$files = Get-ChildItem -LiteralPath $dir -File |
  Where-Object { $_.Extension -match '^\.(jpe?g|png)$' } |
  Sort-Object Name |
  Select-Object -ExpandProperty Name

Write-Host ""
Write-Host ("Carpeta: {0}" -f $dir)
Write-Host ("Archivos: {0}" -f $files.Count)
Write-Host ""
Write-Host "Pega este valor en data-gallery-files:"
Write-Host ""
Write-Host ($files -join ',')
