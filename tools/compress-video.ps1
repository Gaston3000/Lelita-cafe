Param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Input = 'Fotos/LELITA.mp4',
  [int]$Crf = 28,
  [int]$MaxWidth = 1280,
  [int]$AudioBitrateKbps = 0
)

# Comprime el video hero para mobile.
# Requiere ffmpeg en el PATH (instalar: winget install Gyan.FFmpeg).
# Genera LELITA-web.mp4 (H.264) y LELITA-web.webm (VP9) con poster.jpg como frame inicial.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue)
if (-not $ffmpeg) {
  throw 'ffmpeg no esta instalado. Instalalo con: winget install Gyan.FFmpeg'
}

$src = Join-Path $Root $Input
if (-not (Test-Path -LiteralPath $src)) { throw "No existe: $src" }

$base = [System.IO.Path]::GetDirectoryName($src)
$name = [System.IO.Path]::GetFileNameWithoutExtension($src)

$mp4Out  = Join-Path $base "$name-web.mp4"
$webmOut = Join-Path $base "$name-web.webm"
$poster  = Join-Path $base "$name-poster.jpg"

# H.264 (compatibilidad universal)
$audio = if ($AudioBitrateKbps -gt 0) { @('-c:a','aac','-b:a',("{0}k" -f $AudioBitrateKbps)) } else { @('-an') }
& ffmpeg -y -i $src `
  -vf "scale='min($MaxWidth,iw)':'-2':force_original_aspect_ratio=decrease,fps=30" `
  -c:v libx264 -profile:v high -preset slow -crf $Crf -pix_fmt yuv420p `
  -movflags +faststart `
  @audio `
  $mp4Out

# WebM/VP9 (tamaño menor para browsers modernos)
& ffmpeg -y -i $src `
  -vf "scale='min($MaxWidth,iw)':'-2':force_original_aspect_ratio=decrease,fps=30" `
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good `
  @audio `
  $webmOut

# Poster (frame 1 segundo)
& ffmpeg -y -i $src -ss 00:00:01 -vframes 1 -q:v 3 $poster

Write-Host ''
Write-Host ("MP4 :  {0}  ({1:N2} MB)" -f $mp4Out, ((Get-Item $mp4Out).Length/1MB))
Write-Host ("WebM:  {0}  ({1:N2} MB)" -f $webmOut, ((Get-Item $webmOut).Length/1MB))
Write-Host ("Poster: {0}  ({1:N2} KB)" -f $poster, ((Get-Item $poster).Length/1KB))
Write-Host ''
Write-Host "Luego actualiza el hero en index.html para usar:"
Write-Host "  <source src=`"Fotos/$name-web.webm`" type=`"video/webm`" />"
Write-Host "  <source src=`"Fotos/$name-web.mp4`" type=`"video/mp4`" />"
Write-Host "  poster=`"Fotos/$name-poster.jpg`""
