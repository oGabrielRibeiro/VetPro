#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$EnvFilePath = Join-Path $ProjectRoot ".env"

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

function Test-DockerDaemon {
  docker version *> $null
  return ($LASTEXITCODE -eq 0)
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
  $major = Get-NodeMajorVersion
  if ($null -eq $major) {
    Write-Host "Node.js nao encontrado no host. Isso nao impede o Docker, mas para rodar frontend local use Node 20.x." -ForegroundColor Yellow
    return
  }

  $rawVersion = node -v 2>$null
  if ($major -ge 20) {
    Write-Host "Node.js no host: OK ($rawVersion)." -ForegroundColor Green
    return
  }

  Write-Host "Node.js no host: $rawVersion (recomendado: 20.x)." -ForegroundColor Yellow
  Write-Host "Para build local do frontend, use Node 20.x para evitar falhas de compilacao." -ForegroundColor Yellow
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

  $requiredKeys = @("DATABASE_URL", "JWT_SECRET")
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

  $optionalOpenAi = Read-EnvValue -FilePath $EnvFilePath -Key "OPENAI_API_KEY"
  if ([string]::IsNullOrWhiteSpace($optionalOpenAi)) {
    Write-Host "Aviso: OPENAI_API_KEY ausente no .env. Recursos de IA podem ficar limitados." -ForegroundColor Yellow
  }
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
    } catch {
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
    return
  }

  $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $dockerDesktopPath)) {
    throw @"
Docker daemon indisponivel e o executavel do Docker Desktop nao foi encontrado em:
  $dockerDesktopPath
Abra o Docker Desktop manualmente e execute novamente:
  .\up.ps1
"@
  }

  Write-Host "Docker Desktop fechado. Abrindo Docker Desktop..." -ForegroundColor Yellow
  Start-Process -FilePath $dockerDesktopPath | Out-Null

  $timeoutSeconds = 120
  $elapsed = 0
  while ($elapsed -lt $timeoutSeconds) {
    Start-Sleep -Seconds 3
    $elapsed += 3
    if (Test-DockerDaemon) {
      Write-Host "Docker daemon online." -ForegroundColor Green
      return
    }
  }

  throw @"
Docker Desktop foi iniciado, mas o daemon nao ficou disponivel dentro de $timeoutSeconds segundos.
Verifique o Docker Desktop e tente novamente:
  .\up.ps1
"@
}

Write-Host "Subindo VetPro via Docker..." -ForegroundColor Cyan

if (-not (Test-CommandAvailable -Name "docker")) {
  throw "Docker CLI nao encontrado no PATH."
}

Show-NodeVersionStatus
Validate-EnvFile
Start-DockerDesktopIfNeeded

docker compose up --build -d
Assert-LastExitCode "Falha ao executar 'docker compose up --build -d'."

Write-Host "Aguardando backend ficar online..." -ForegroundColor Cyan
if (-not (Wait-HttpReady -Url "http://localhost:5000/health")) {
  Write-Host "Backend nao respondeu em /health dentro do timeout." -ForegroundColor Red
  docker compose logs backend --tail 80
  throw "Falha no health check do backend."
}

Write-Host "Aguardando frontend ficar online..." -ForegroundColor Cyan
if (-not (Wait-HttpReady -Url "http://localhost:3000")) {
  Write-Host "Frontend nao respondeu dentro do timeout." -ForegroundColor Red
  docker compose logs frontend --tail 80
  throw "Falha no health check do frontend."
}

Write-Host ""
Write-Host "OK. Acesse:" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5000"
Show-ComposeStatus
