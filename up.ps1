#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param(
    [string]$Message = "Comando falhou."
  )

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code: $LASTEXITCODE)"
  }
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

  if ($major -eq 20) {
    Write-Host "Node.js no host: OK (20.x)." -ForegroundColor Green
    return
  }

  $rawVersion = node -v 2>$null
  Write-Host "Node.js no host: $rawVersion (recomendado: 20.x)." -ForegroundColor Yellow
  Write-Host "Para build local do frontend, use Node 20.x para evitar falhas de compilacao." -ForegroundColor Yellow
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

Show-NodeVersionStatus
Start-DockerDesktopIfNeeded

docker compose up --build -d
Assert-LastExitCode "Falha ao executar 'docker compose up --build -d'."

Write-Host ""
Write-Host "OK. Acesse:" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5000"
