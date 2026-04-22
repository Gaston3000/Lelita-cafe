param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [int]$MaxPerFile = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Text([string]$text) {
  if ($null -eq $text) { return '' }
  $t = $text
  $t = $t -replace "\s+", ' '
  $t = $t.Trim()
  $t = $t -replace '&amp;', '&'
  $t = $t -replace '&quot;', '"'
  $t = $t -replace '&apos;', "'"
  $t = $t -replace '&lt;', '<'
  $t = $t -replace '&gt;', '>'
  return $t
}

function Relax-Key([string]$key) {
  if ($null -eq $key) { return '' }
  return ($key -replace "[;.]$", '').Trim()
}

function Extract-ObjectBlock([string]$source, [string]$marker) {
  $idx = $source.IndexOf($marker, [System.StringComparison]::Ordinal)
  if ($idx -lt 0) { throw "No se encontró el marcador: $marker" }

  $start = $source.IndexOf('{', $idx)
  if ($start -lt 0) { throw "No se encontró '{' después de $marker" }

  $depth = 0
  for ($i = $start; $i -lt $source.Length; $i++) {
    $ch = $source[$i]
    if ($ch -eq '{') { $depth++ }
    elseif ($ch -eq '}') {
      $depth--
      if ($depth -eq 0) {
        return $source.Substring($start, ($i - $start + 1))
      }
    }
  }
  throw "No se pudo balancear llaves para: $marker"
}

function Extract-KeysFromObject([string]$objectBlock) {
  $keys = New-Object System.Collections.Generic.HashSet[string]

  # Match keys of form '...':
  $rx = [regex]"'((?:\\'|[^'])*)'\s*:"
  foreach ($m in $rx.Matches($objectBlock)) {
    $k = $m.Groups[1].Value -replace "\\'", "'"
    if (![string]::IsNullOrWhiteSpace($k)) {
      [void]$keys.Add((Normalize-Text $k))
    }
  }
  Write-Output -NoEnumerate $keys
}

function Extract-StringsFromHtml([string]$html) {
  $strings = New-Object System.Collections.Generic.HashSet[string]

  $patterns = @(
    '<a[^>]*class="[^"]*nav-link[^"]*"[^>]*>\s*([^<]+?)\s*</a>',
    '<a[^>]*class="[^"]*pill-link[^"]*"[^>]*>\s*([^<]+?)\s*</a>',
    '<h1[^>]*class="[^"]*title[^"]*"[^>]*>\s*([^<]+?)\s*</h1>',
    '<h2[^>]*>\s*([^<]+?)\s*</h2>',
    '<button[^>]*class="[^"]*accordion-toggle[^"]*"[^>]*>\s*([^<]+?)\s*</button>',
    '<h3[^>]*class="[^"]*dish-name[^"]*"[^>]*>\s*([^<]+?)\s*</h3>',
    '<p[^>]*class="[^"]*dish-desc[^"]*"[^>]*>\s*([^<]+?)\s*</p>',
    '<title>\s*([^<]+?)\s*</title>',
    '<a[^>]*aria-label="([^"]+?)"[^>]*>'
  )

  foreach ($pat in $patterns) {
    $rx = [regex]::new($pat, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    foreach ($m in $rx.Matches($html)) {
      $t = Normalize-Text $m.Groups[1].Value
      if ($t.Length -lt 2) { continue }
      if ($t -match '^\$?\d') { continue }
      if ($t -match '^(ESP|ENG|POR)$') { continue }
      if ($t -match '^\s*$') { continue }
      [void]$strings.Add($t)
    }
  }

  Write-Output -NoEnumerate $strings
}

$codigoPath = Join-Path $Root 'codigo.js'
if (!(Test-Path $codigoPath)) { throw "No existe: $codigoPath" }

$codigo = Get-Content -LiteralPath $codigoPath -Raw -Encoding UTF8

# Extraer bloques en / pt dentro de TEXT_TRANSLATIONS
$translationsBlock = Extract-ObjectBlock $codigo "const TEXT_TRANSLATIONS = {"
$enBlock = Extract-ObjectBlock $translationsBlock "en: {"
$ptBlock = Extract-ObjectBlock $translationsBlock "pt: {"

$enKeys = Extract-KeysFromObject $enBlock
$ptKeys = Extract-KeysFromObject $ptBlock

$htmlFiles = Get-ChildItem -LiteralPath $Root -Filter '*.html' -File | Sort-Object Name

Write-Host "\n=== i18n audit (keys faltantes) ===\n"
Write-Host "Root: $Root"
$enCount = if ($null -ne $enKeys) { $enKeys.Count } else { 0 }
$ptCount = if ($null -ne $ptKeys) { $ptKeys.Count } else { 0 }
Write-Host "EN keys: $enCount | PT keys: $ptCount\n"

foreach ($file in $htmlFiles) {
  $html = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  $strings = Extract-StringsFromHtml $html

  $missingEn = New-Object System.Collections.Generic.List[string]
  $missingPt = New-Object System.Collections.Generic.List[string]

  foreach ($s in $strings) {
    $relaxed = Relax-Key $s
    $hasEn = $enKeys.Contains($s) -or ($relaxed -ne $s -and $enKeys.Contains($relaxed))
    $hasPt = $ptKeys.Contains($s) -or ($relaxed -ne $s -and $ptKeys.Contains($relaxed))

    if (-not $hasEn) { $missingEn.Add($s) }
    if (-not $hasPt) { $missingPt.Add($s) }
  }

  if ($missingEn.Count -eq 0 -and $missingPt.Count -eq 0) { continue }

  Write-Host "\n--- $($file.Name) ---"
  Write-Host ("EN faltan: {0} | PT faltan: {1}" -f $missingEn.Count, $missingPt.Count)

  if ($missingEn.Count -gt 0) {
    Write-Host "EN (primeros $MaxPerFile):"
    $missingEn | Sort-Object | Select-Object -First $MaxPerFile | ForEach-Object { Write-Host "  - $_" }
  }

  if ($missingPt.Count -gt 0) {
    Write-Host "PT (primeros $MaxPerFile):"
    $missingPt | Sort-Object | Select-Object -First $MaxPerFile | ForEach-Object { Write-Host "  - $_" }
  }
}

Write-Host "\nListo. Si querés, también puedo autogenerar el bloque de claves para pegar en TEXT_TRANSLATIONS."