Param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$NewVersion
)

# Actualiza el sufijo ?v=YYYYMMDD en los HTML (y CSS si hace falta) para romper el cache del navegador.
# Si no se pasa -NewVersion, usa la fecha de hoy en formato yyyyMMdd.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($NewVersion)) {
  $NewVersion = Get-Date -Format 'yyyyMMdd'
}

if ($NewVersion -notmatch '^[0-9]{6,14}$') {
  throw "NewVersion invalido: '$NewVersion'. Se esperaban solo digitos (ej: 20260421)."
}

$targets = Get-ChildItem -LiteralPath $Root -Filter '*.html' -File
$targets += Get-ChildItem -LiteralPath $Root -Filter '*.css' -File -ErrorAction SilentlyContinue
$targets += Get-ChildItem -LiteralPath $Root -Filter '*.js' -File -ErrorAction SilentlyContinue

$totalChanges = 0
foreach ($t in $targets) {
  $raw = Get-Content -LiteralPath $t.FullName -Raw -Encoding UTF8
  $new = [regex]::Replace($raw, '\?v=\d{6,14}', "?v=$NewVersion")
  if ($new -ne $raw) {
    [System.IO.File]::WriteAllText($t.FullName, $new, (New-Object System.Text.UTF8Encoding($false)))
    $count = ([regex]::Matches($raw, '\?v=\d{6,14}')).Count
    $totalChanges += $count
    Write-Host ("  {0}  ({1} referencias)" -f $t.Name, $count)
  }
}

Write-Host ""
Write-Host ("Version nueva: {0}" -f $NewVersion)
Write-Host ("Total de referencias actualizadas: {0}" -f $totalChanges)
