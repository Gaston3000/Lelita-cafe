Param(
  [Parameter(Mandatory=$false)][string]$Path = '',
  [switch]$Webp,
  [switch]$All,
  [switch]$Modified,
  [string]$RemoteRoot = 'public_html',
  [string]$EnvFile = ''
)

# Deploy a Don Web por FTP usando .NET built-in (no requiere WinSCP ni FileZilla).
# Uso tipico:
#   .\tools\deploy.ps1 -Webp                          # sube solo los .webp (fix inmediato del 404)
#   .\tools\deploy.ps1 -Path styles.css               # sube un archivo puntual
#   .\tools\deploy.ps1 -Path Fotos\galeria-lleita     # sube una carpeta entera (recursivo)
#   .\tools\deploy.ps1 -Modified                      # sube solo lo modificado en las ultimas 48 horas (html/css/js)
#   .\tools\deploy.ps1 -All                           # sube TODO el sitio (tarda)
#
# Credenciales: se leen de un .env en la raiz del sitio (o pasa -EnvFile).
# Variables esperadas:
#   FTP_HOST=ftp.lelita.com.ar
#   FTP_USER=usuario
#   FTP_PASS=password
#   FTP_PORT=21          (opcional, default 21)
#   FTP_SECURE=0         (opcional, 1 para FTPS explicit)
#
# El .env esta en .gitignore, NUNCA se sube a GitHub ni a Don Web.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$siteRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Read-DotEnv([string]$file) {
  if (-not (Test-Path $file)) { return @{} }
  $map = @{}
  foreach ($line in Get-Content -LiteralPath $file -Encoding UTF8) {
    $t = $line.Trim()
    if ($t.Length -eq 0 -or $t.StartsWith('#')) { continue }
    $eq = $t.IndexOf('=')
    if ($eq -lt 1) { continue }
    $k = $t.Substring(0, $eq).Trim()
    $v = $t.Substring($eq + 1).Trim().Trim('"').Trim("'")
    $map[$k] = $v
  }
  return $map
}

if ([string]::IsNullOrWhiteSpace($EnvFile)) { $EnvFile = Join-Path $siteRoot '.env' }
$cfg = Read-DotEnv $EnvFile
$ftpHost = $cfg['FTP_HOST']; if (-not $ftpHost) { $ftpHost = $env:FTP_HOST }
$ftpUser = $cfg['FTP_USER']; if (-not $ftpUser) { $ftpUser = $env:FTP_USER }
$ftpPass = $cfg['FTP_PASS']; if (-not $ftpPass) { $ftpPass = $env:FTP_PASS }
$ftpPort = $cfg['FTP_PORT']; if (-not $ftpPort) { $ftpPort = $env:FTP_PORT }
$ftpSecure = $cfg['FTP_SECURE']; if (-not $ftpSecure) { $ftpSecure = $env:FTP_SECURE }
if (-not $ftpPort) { $ftpPort = '21' }

if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
  Write-Host "FALTAN CREDENCIALES. Crea .env en la raiz con:" -ForegroundColor Yellow
  Write-Host "  FTP_HOST=ftp.tu-dominio.com"
  Write-Host "  FTP_USER=usuario"
  Write-Host "  FTP_PASS=password"
  Write-Host "  FTP_PORT=21           # opcional"
  Write-Host "  FTP_SECURE=0          # opcional, 1 para FTPS"
  throw "Credenciales FTP no encontradas."
}

$scheme = if ($ftpSecure -eq '1') { 'ftps' } else { 'ftp' }
$baseUri = "${scheme}://${ftpHost}:${ftpPort}"
$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

# Cache de directorios remotos ya creados (para no pedir MKD repetido).
$script:mkdCache = @{}

function Ensure-RemoteDir([string]$remoteDir) {
  # remoteDir ej: "public_html/Fotos/galeria-lleita". Crea cada nivel si no existe.
  if ([string]::IsNullOrWhiteSpace($remoteDir)) { return }
  $parts = $remoteDir -split '/' | Where-Object { $_ -ne '' }
  $acc = ''
  foreach ($p in $parts) {
    $acc = if ($acc -eq '') { $p } else { "$acc/$p" }
    if ($script:mkdCache.ContainsKey($acc)) { continue }
    try {
      $req = [System.Net.FtpWebRequest]::Create("$baseUri/$acc")
      $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
      $req.Credentials = $cred
      $req.EnableSsl = ($ftpSecure -eq '1')
      $req.UsePassive = $true
      $req.KeepAlive = $true
      $resp = $req.GetResponse()
      $resp.Close()
    } catch [System.Net.WebException] {
      # 550 = already exists or no permission; continuamos (si no existe de verdad va a fallar el PUT despues)
    }
    $script:mkdCache[$acc] = $true
  }
}

function Upload-File([string]$localPath, [string]$remotePath) {
  $remoteDir = Split-Path $remotePath -Parent
  $remoteDir = $remoteDir -replace '\\','/'
  Ensure-RemoteDir $remoteDir
  $remotePathFwd = $remotePath -replace '\\','/'
  $uri = "$baseUri/$remotePathFwd"
  $req = [System.Net.FtpWebRequest]::Create($uri)
  $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
  $req.Credentials = $cred
  $req.EnableSsl = ($ftpSecure -eq '1')
  $req.UsePassive = $true
  $req.UseBinary = $true
  $req.KeepAlive = $true
  $bytes = [System.IO.File]::ReadAllBytes($localPath)
  $req.ContentLength = $bytes.Length
  $stream = $req.GetRequestStream()
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Close()
  $resp = $req.GetResponse()
  $resp.Close()
}

function Deploy-FileSet($files) {
  $total = $files.Count
  if ($total -eq 0) { Write-Host "Nada que subir." -ForegroundColor Yellow; return }
  Write-Host ("Subiendo {0} archivos a ftp://{1}/{2} ..." -f $total, $ftpHost, $RemoteRoot) -ForegroundColor Cyan
  $i = 0
  $okCount = 0
  $failList = @()
  foreach ($f in $files) {
    $i++
    $rel = $f.FullName.Substring($siteRoot.Length + 1) -replace '\\','/'
    $remote = "$RemoteRoot/$rel"
    Write-Host ("  [{0}/{1}] {2}" -f $i, $total, $rel)
    try {
      Upload-File $f.FullName $remote
      $okCount++
    } catch {
      Write-Host ("     ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
      $failList += $rel
    }
  }
  Write-Host ""
  Write-Host ("OK: {0} / {1}" -f $okCount, $total) -ForegroundColor Green
  if ($failList.Count -gt 0) {
    Write-Host ("Fallaron {0} archivos:" -f $failList.Count) -ForegroundColor Red
    $failList | ForEach-Object { Write-Host "  $_" }
  }
}

# === Resolucion de que subir segun flags ===
$files = @()

if ($Webp) {
  $files = Get-ChildItem -LiteralPath (Join-Path $siteRoot 'Fotos') -Filter '*.webp' -Recurse -File
} elseif ($All) {
  $excludeRoots = @('.git', '.github', '.claude', 'tools', 'node_modules')
  $files = Get-ChildItem -LiteralPath $siteRoot -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($siteRoot.Length + 1)
    $first = ($rel -split '[\\/]')[0]
    ($excludeRoots -notcontains $first) -and ($_.Name -notin @('.gitignore', '.env', 'webp-pack.zip'))
  }
} elseif ($Modified) {
  $cutoff = (Get-Date).AddHours(-48)
  $exts = @('.html','.css','.js','.webmanifest','.xml','.txt')
  $files = Get-ChildItem -LiteralPath $siteRoot -File | Where-Object {
    ($exts -contains $_.Extension.ToLower()) -and ($_.LastWriteTime -gt $cutoff)
  }
} elseif ($Path) {
  $full = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $siteRoot $Path }
  if (-not (Test-Path $full)) { throw "No existe: $full" }
  $item = Get-Item -LiteralPath $full
  if ($item.PSIsContainer) {
    $files = Get-ChildItem -LiteralPath $full -Recurse -File
  } else {
    $files = @($item)
  }
} else {
  Write-Host "Uso:"
  Write-Host "  .\tools\deploy.ps1 -Webp            # sube todos los .webp faltantes"
  Write-Host "  .\tools\deploy.ps1 -Modified        # sube html/css/js modificados ultimas 48h"
  Write-Host "  .\tools\deploy.ps1 -Path Fotos      # sube una carpeta (recursivo)"
  Write-Host "  .\tools\deploy.ps1 -Path styles.css # sube un archivo"
  Write-Host "  .\tools\deploy.ps1 -All             # sube TODO (tarda)"
  exit 0
}

Deploy-FileSet $files
