Param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [int]$MaxSize = 1920,
  [int]$JpegQuality = 82,
  [switch]$NoBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$photosDir = Join-Path $Root 'Fotos'
if (-not (Test-Path -LiteralPath $photosDir)) {
  throw "No se encontró la carpeta: $photosDir"
}

$imDir = Get-ChildItem 'C:\Program Files' -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'ImageMagick-*' } |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $imDir) {
  throw "ImageMagick no está instalado. Instalalo con: winget install --id ImageMagick.ImageMagick"
}

$magickExe = Join-Path $imDir.FullName 'magick.exe'
if (-not (Test-Path -LiteralPath $magickExe)) {
  throw "No se encontró magick.exe en: $($imDir.FullName)"
}

if (-not $NoBackup) {
  $backupDir = Join-Path $Root ('Fotos_backup_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
  Write-Host "Creando backup en: $backupDir"
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  robocopy $photosDir $backupDir /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
}

$files = Get-ChildItem -LiteralPath $photosDir -Recurse -File |
  Where-Object { $_.Extension -in '.jpg', '.jpeg', '.png' }

Write-Host "Optimizando $($files.Count) archivos en $photosDir"

$processed = 0
$skipped = 0

foreach ($file in $files) {
  $processed++

  $tmp = $file.FullName + '.tmp'

  try {
    if ($file.Extension -match '\.jpe?g$') {
      & $magickExe $file.FullName `
        -auto-orient `
        -strip `
        -resize "${MaxSize}x${MaxSize}>" `
        -sampling-factor 4:2:0 `
        -interlace Plane `
        -quality $JpegQuality `
        $tmp
    }
    elseif ($file.Extension -eq '.png') {
      & $magickExe $file.FullName `
        -auto-orient `
        -strip `
        -resize "${MaxSize}x${MaxSize}>" `
        -define png:compression-level=9 `
        -define png:compression-strategy=1 `
        $tmp
    }

    if (Test-Path -LiteralPath $tmp) {
      Move-Item -LiteralPath $tmp -Destination $file.FullName -Force
    }

    if (($processed % 10) -eq 0) {
      Write-Host "Procesados: $processed / $($files.Count)"
    }
  }
  catch {
    $skipped++
    if (Test-Path -LiteralPath $tmp) {
      Remove-Item -LiteralPath $tmp -Force
    }
    Write-Warning "No se pudo optimizar: $($file.FullName). Error: $($_.Exception.Message)"
  }
}

$bytesTotal = (Get-ChildItem -LiteralPath $Root -Recurse -Force -File | Measure-Object Length -Sum).Sum
$bytesPhotos = (Get-ChildItem -LiteralPath $photosDir -Recurse -Force -File | Measure-Object Length -Sum).Sum

Write-Host ("FOTOS_TOTAL_MB=" + [math]::Round($bytesPhotos/1MB,2))
Write-Host ("SITE_TOTAL_MB=" + [math]::Round($bytesTotal/1MB,2))
Write-Host ("Listo. Skipped=" + $skipped)
