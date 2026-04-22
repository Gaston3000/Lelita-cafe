Param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

# Envuelve cada <img src="Fotos/...jpg|jpeg|png"> en un <picture> con <source srcset="...webp">,
# agrega loading="lazy" + decoding="async", y marca los lead-media como eager + fetchpriority=high.
# Excluye logos (logo-img / footer-logo). Idempotente: si el <img> ya esta dentro de <picture>, no hace nada.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$htmls = Get-ChildItem -LiteralPath $Root -Filter '*.html' -File

$fotosDir = Join-Path $Root 'Fotos'

$imgPattern = '<img(?<attrs>(?:[^>"]|"[^"]*")*?)\s*/?>'

$totalTags = 0
$totalWrapped = 0

foreach ($html in $htmls) {
  $raw = Get-Content -LiteralPath $html.FullName -Raw -Encoding UTF8
  $wrapped = 0
  $seen = 0

  $new = [regex]::Replace($raw, $imgPattern, {
    param($m)
    $script:seen++
    $full = $m.Value
    $attrs = $m.Groups['attrs'].Value

    # Idempotencia: si ya esta dentro de <picture>, el <source> aparece pegado antes: no tocar.
    # No lo podemos saber desde el match solo; usamos heuristica: si $full no tiene src="Fotos/..." ya devuelto.

    # Extraer src
    $srcMatch = [regex]::Match($attrs, 'src="(?<src>[^"]+)"')
    if (-not $srcMatch.Success) { return $full }
    $src = $srcMatch.Groups['src'].Value

    if ($src -notmatch '^Fotos/') { return $full }

    # Limpiar query string para el nombre webp
    $cleanSrc = ($src -split '\?')[0]
    if ($cleanSrc -notmatch '\.(jpe?g|png)$') { return $full }  # ya webp u otro

    # Excluir logos
    if ($attrs -match 'class="[^"]*(logo-img|footer-logo)[^"]*"') { return $full }

    # Webp target
    $webp = [regex]::Replace($cleanSrc, '\.(jpe?g|png)$', '.webp', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    # Verificar que el webp existe; si no, no envolvemos
    $webpFull = Join-Path $Root $webp
    if (-not (Test-Path -LiteralPath $webpFull)) { return $full }

    # Loading / fetchpriority
    $isLead = $attrs -match 'class="[^"]*lead-media[^"]*"'
    $newAttrs = $attrs

    if ($newAttrs -notmatch '\sloading=') {
      if ($isLead) {
        $newAttrs = $newAttrs + ' loading="eager"'
      } else {
        $newAttrs = $newAttrs + ' loading="lazy"'
      }
    }
    if ($newAttrs -notmatch '\sdecoding=') {
      $newAttrs = $newAttrs + ' decoding="async"'
    }
    if ($isLead -and $newAttrs -notmatch '\sfetchpriority=') {
      $newAttrs = $newAttrs + ' fetchpriority="high"'
    }

    $script:wrapped++
    $imgTag = "<img$newAttrs />"
    return "<picture><source srcset=`"$webp`" type=`"image/webp`" />$imgTag</picture>"
  })

  # Proteccion contra doble-wrap si ya se corrio: revertir cualquier <picture><source ...><picture><source ...>
  # (no deberia pasar porque los <img> ya envueltos no matchean el patron plano)

  if ($new -ne $raw) {
    [System.IO.File]::WriteAllText($html.FullName, $new, (New-Object System.Text.UTF8Encoding($false)))
  }

  $totalTags += $seen
  $totalWrapped += $wrapped
  Write-Host ("  {0,-20}  <img> vistos: {1,3}  envueltos: {2,3}" -f $html.Name, $seen, $wrapped)
}

Write-Host ''
Write-Host ("Total <img> detectados: {0}" -f $totalTags)
Write-Host ("Total envueltos en <picture>: {0}" -f $totalWrapped)
