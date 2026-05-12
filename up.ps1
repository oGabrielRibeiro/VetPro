#!/usr/bin/env pwsh

[CmdletBinding()]
param(
  [ValidateSet("docker", "dev")]
  [string]$Mode = "docker",
  [switch]$NoBrowser,
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = $PSScriptRoot
$EnvFilePath = Join-Path $ProjectRoot ".env"
$FrontendDir = Join-Path $ProjectRoot "vetpro-front"
$FrontendPackageJsonPath = Join-Path $FrontendDir "package.json"
$CacheDir = Join-Path $ProjectRoot ".vetpro-cache"
$FrontendNginxConfigPath = Join-Path $FrontendDir "nginx.conf"
$BackendHealthUrl = "http://localhost:5000/health/live"
$BackendReadinessUrl = "http://localhost:5000/health/ready"
$FrontendUrl = "http://localhost:3000"

function Assert-LastExitCode {
  param(
    [string]$Message = "Comando falhou."
  )

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code: $LASTEXITCODE)"
  }
}

function Test-CommandAvailable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  return ($null -ne $cmd)
}

function Invoke-Compose {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,
    [Parameter(Mandatory = $true)]
    [string]$ErrorMessage
  )

  & docker compose @Args
  Assert-LastExitCode $ErrorMessage
}

function Test-DockerDaemon {
  docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

function Should-ForceFrontendNoCacheBuild {
  if (-not (Test-Path $FrontendNginxConfigPath)) {
    return $false
  }

  if (-not (Test-Path $CacheDir)) {
    New-Item -ItemType Directory -Path $CacheDir | Out-Null
  }

  $hashPath = Join-Path $CacheDir "frontend-nginx.hash"
  $currentHash = (Get-FileHash -Path $FrontendNginxConfigPath -Algorithm SHA256).Hash
  $previousHash = $null
  if (Test-Path $hashPath) {
    $previousHash = (Get-Content -Path $hashPath -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  }

  if ($currentHash -ne $previousHash) {
    Set-Content -Path $hashPath -Value $currentHash
    return $true
  }

  return $false
}

function Get-NodeMajorVersion {
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) {
    return $null
  }

  $nodeVersion = node -v 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $nodeVersion) {
    return $null
  }

  $versionText = $nodeVersion.Trim().TrimStart("v")
  $parts = $versionText.Split(".")
  if ($parts.Length -lt 1) {
    return $null
  }

  $major = 0
  if (-not [int]::TryParse($parts[0], [ref]$major)) {
    return $null
  }

  return $major
}

function Show-NodeVersionStatus {
  param(
    [switch]$RequireForFrontend
  )

  $major = Get-NodeMajorVersion
  if ($null -eq $major) {
    if ($RequireForFrontend) {
      throw "Node.js nao encontrado no host. No modo dev ele e obrigatorio (Node 20.x)."
    }

    Write-Host "Node.js nao encontrado no host. Isso nao impede modo docker." -ForegroundColor Yellow
    return
  }

  $rawVersion = node -v 2>$null
  if ($major -ge 20 -and $major -lt 21) {
    Write-Host "Node.js no host: OK ($rawVersion)." -ForegroundColor Green
    return
  }

  if ($RequireForFrontend) {
    throw "Node.js no host: $rawVersion. O modo dev exige Node 20.x."
  }

  Write-Host "Node.js no host: $rawVersion (recomendado: 20.x)." -ForegroundColor Yellow
}

function Read-EnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $line = Select-String -Path $FilePath -Pattern "^\s*$Key\s*=\s*(.+)\s*$" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $raw = $line.Matches[0].Groups[1].Value.Trim()
  if ($raw.StartsWith('"') -and $raw.EndsWith('"')) {
    return $raw.Trim('"')
  }
  if ($raw.StartsWith("'") -and $raw.EndsWith("'")) {
    return $raw.Trim("'")
  }
  return $raw
}

function Validate-EnvFile {
  if (-not (Test-Path $EnvFilePath)) {
    Write-Host "Aviso: .env nao encontrado na raiz ($EnvFilePath)." -ForegroundColor Yellow
    Write-Host "Algumas funcionalidades podem falhar sem variaveis locais." -ForegroundColor Yellow
    return
  }

  $requiredKeys = @("JWT_SECRET")
  $missing = @()
  foreach ($key in $requiredKeys) {
    $value = Read-EnvValue -FilePath $EnvFilePath -Key $key
    if ([string]::IsNullOrWhiteSpace($value)) {
      $missing += $key
    }
  }

  if ($missing.Count -gt 0) {
    $joined = $missing -join ", "
    Write-Host "Aviso: variaveis ausentes no .env: $joined" -ForegroundColor Yellow
    Write-Host "O compose pode suprir parte disso, mas valide se houver falha de auth/db." -ForegroundColor Yellow
  }

  $databaseUrl = Read-EnvValue -FilePath $EnvFilePath -Key "DATABASE_URL"
  $postgresUser = Read-EnvValue -FilePath $EnvFilePath -Key "POSTGRES_USER"
  $postgresPassword = Read-EnvValue -FilePath $EnvFilePath -Key "POSTGRES_PASSWORD"
  $postgresDb = Read-EnvValue -FilePath $EnvFilePath -Key "POSTGRES_DB"

  $hasDatabaseUrl = -not [string]::IsNullOrWhiteSpace($databaseUrl)
  $hasPostgresTriplet = (
    -not [string]::IsNullOrWhiteSpace($postgresUser) -and
    -not [string]::IsNullOrWhiteSpace($postgresPassword) -and
    -not [string]::IsNullOrWhiteSpace($postgresDb)
  )

  if (-not $hasDatabaseUrl -and -not $hasPostgresTriplet) {
    Write-Host "Aviso: defina DATABASE_URL ou POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB no .env para evitar falhas de banco." -ForegroundColor Yellow
  }

  $optionalOpenAi = Read-EnvValue -FilePath $EnvFilePath -Key "OPENAI_API_KEY"
  if ([string]::IsNullOrWhiteSpace($optionalOpenAi)) {
    Write-Host "Aviso: OPENAI_API_KEY ausente no .env. Recursos de IA podem ficar limitados." -ForegroundColor Yellow
  }

  $viteApiBase = Read-EnvValue -FilePath $EnvFilePath -Key "VITE_API_BASE_URL"
  $legacyApiBase = Read-EnvValue -FilePath $EnvFilePath -Key "REACT_APP_API_BASE_URL"
  if ([string]::IsNullOrWhiteSpace($viteApiBase) -and -not [string]::IsNullOrWhiteSpace($legacyApiBase)) {
    Write-Host "Aviso: encontrado apenas REACT_APP_API_BASE_URL. Prefira VITE_API_BASE_URL para o frontend atual." -ForegroundColor Yellow
  }
}

function Show-FrontendStackStatus {
  if (-not (Test-Path $FrontendPackageJsonPath)) {
    Write-Host "Aviso: package.json do frontend nao encontrado em $FrontendPackageJsonPath." -ForegroundColor Yellow
    return
  }

  try {
    $pkg = Get-Content -Path $FrontendPackageJsonPath -Raw | ConvertFrom-Json
  }
  catch {
    Write-Host "Aviso: nao foi possivel ler package.json do frontend para validar stack." -ForegroundColor Yellow
    return
  }

  $hasViteDep = $false
  if ($pkg.devDependencies -and $pkg.devDependencies.PSObject.Properties.Name -contains "vite") {
    $hasViteDep = $true
  }

  $hasViteScript = $false
  if ($pkg.scripts -and $pkg.scripts.PSObject.Properties.Name -contains "dev") {
    $devScript = [string]$pkg.scripts.dev
    if ($devScript -match "\bvite\b") {
      $hasViteScript = $true
    }
  }

  if ($hasViteDep -and $hasViteScript) {
    Write-Host "Frontend stack: Vite detectado (OK)." -ForegroundColor Green
    return
  }

  Write-Host "Aviso: stack Vite nao detectada completamente no frontend (revise package.json)." -ForegroundColor Yellow
}

function Wait-HttpReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [int]$TimeoutSeconds = 90,
    [int]$IntervalSeconds = 3
  )

  $elapsed = 0
  while ($elapsed -lt $TimeoutSeconds) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -ErrorAction Stop
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        return $true
      }
    }
    catch {
      # segue tentando
    }

    Start-Sleep -Seconds $IntervalSeconds
    $elapsed += $IntervalSeconds
  }

  return $false
}

function Show-ComposeStatus {
  Write-Host ""
  Write-Host "Resumo dos containers:" -ForegroundColor Cyan
  docker compose ps
}

function Start-DockerDesktopIfNeeded {
  if (Test-DockerDaemon) {
    Write-Host "Docker daemon ja esta rodando." -ForegroundColor Green
    return
  }

  $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $dockerDesktopPath)) {
    throw "Docker Desktop nao encontrado em $dockerDesktopPath"
  }

  Write-Host "Docker nao esta rodando. Iniciando Docker Desktop..." -ForegroundColor Yellow
  Start-Process $dockerDesktopPath | Out-Null

  Write-Host "Aguardando Docker iniciar..." -ForegroundColor Cyan
  $timeout = 120
  $elapsed = 0

  while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 4
    $elapsed += 4

    if (Test-DockerDaemon) {
      Write-Host "Docker iniciado com sucesso." -ForegroundColor Green
      return
    }
  }

  throw "Docker nao iniciou dentro do tempo esperado."
}

function Ensure-FrontendDependencies {
  if (-not (Test-Path $FrontendDir)) {
    throw "Diretorio do frontend nao encontrado: $FrontendDir"
  }

  if (Test-Path (Join-Path $FrontendDir "node_modules")) {
    Write-Host "Dependencias do frontend ja estao instaladas." -ForegroundColor Green
    return
  }

  Write-Host "Instalando dependencias do frontend..." -ForegroundColor Cyan
  Push-Location $FrontendDir
  try {
    if (Test-Path "package-lock.json") {
      npm ci
      Assert-LastExitCode "Falha ao executar 'npm ci' no frontend."
    }
    else {
      npm install
      Assert-LastExitCode "Falha ao executar 'npm install' no frontend."
    }
  }
  finally {
    Pop-Location
  }
}

function Start-FrontendDevServer {
  if (-not (Test-CommandAvailable -Name "npm")) {
    throw "NPM nao encontrado no PATH. O modo dev exige Node/NPM no host."
  }

  Write-Host "Iniciando frontend local (vite)..." -ForegroundColor Cyan
  Start-Process -FilePath "powershell" -WorkingDirectory $FrontendDir -ArgumentList "-NoExit", "-Command", "npm run dev" | Out-Null
}

function Open-WebApp {
  if ($NoBrowser) {
    Write-Host "Abertura automatica do navegador desativada (-NoBrowser)." -ForegroundColor Yellow
    return
  }

  Start-Process $FrontendUrl | Out-Null
}

Push-Location $ProjectRoot
try {
  Write-Host ""
  Write-Host "=============================" -ForegroundColor Cyan
  Write-Host " VetPro - Launcher Profissional"
  Write-Host "=============================" -ForegroundColor Cyan
  Write-Host "Modo: $Mode"
  Write-Host ""

  if (-not (Test-CommandAvailable -Name "docker")) {
    throw "Docker CLI nao encontrado no PATH."
  }

  Show-NodeVersionStatus -RequireForFrontend:($Mode -eq "dev")
  Show-FrontendStackStatus
  Validate-EnvFile
  Start-DockerDesktopIfNeeded

  if ($Mode -eq "docker") {
    Write-Host "Subindo stack completa via Docker..." -ForegroundColor Cyan
    $composeArgs = @("up", "-d")
    if (-not $NoBuild) {
      $composeArgs += "--build"
    }

    if (-not $NoBuild -and (Should-ForceFrontendNoCacheBuild)) {
      Write-Host "Detectada alteracao no nginx.conf do frontend. Forcando rebuild sem cache..." -ForegroundColor Yellow
      Invoke-Compose -Args @("build", "--no-cache", "frontend") -ErrorMessage "Falha ao rebuildar frontend sem cache."
    }

    Invoke-Compose -Args $composeArgs -ErrorMessage "Falha ao subir stack completa via Docker Compose."
  }
  else {
    Write-Host "Subindo backend/infra via Docker e frontend local..." -ForegroundColor Cyan
    $composeArgs = @("up", "-d")
    if (-not $NoBuild) {
      $composeArgs += "--build"
    }
    $composeArgs += @("postgres", "redis", "backend")
    Invoke-Compose -Args $composeArgs -ErrorMessage "Falha ao subir postgres/redis/backend via Docker Compose."

    Invoke-Compose -Args @("stop", "frontend") -ErrorMessage "Falha ao parar container frontend."
    Ensure-FrontendDependencies
    Start-FrontendDevServer
  }

  Write-Host "Aguardando backend ficar online..." -ForegroundColor Cyan
  if (-not (Wait-HttpReady -Url $BackendHealthUrl -TimeoutSeconds 120)) {
    Write-Host "Backend nao respondeu em /health/live dentro do timeout." -ForegroundColor Red
    docker compose logs backend --tail 120
    throw "Falha no health check do backend."
  }

  Write-Host "Aguardando backend ficar pronto (readiness)..." -ForegroundColor Cyan
  if (-not (Wait-HttpReady -Url $BackendReadinessUrl -TimeoutSeconds 120)) {
    Write-Host "Backend nao respondeu em /health/ready dentro do timeout." -ForegroundColor Red
    docker compose logs backend --tail 120
    throw "Falha no readiness check do backend."
  }

  Write-Host "Aguardando frontend ficar online..." -ForegroundColor Cyan
  if (-not (Wait-HttpReady -Url $FrontendUrl -TimeoutSeconds 150)) {
    if ($Mode -eq "docker") {
      docker compose logs frontend --tail 120
    }
    throw "Falha no health check do frontend."
  }

  Open-WebApp

  Write-Host ""
  Write-Host "OK. Acesse:" -ForegroundColor Green
  Write-Host "Frontend: $FrontendUrl"
  Write-Host "Backend:  http://localhost:5000"
  Show-ComposeStatus
}
finally {
  Pop-Location
}
