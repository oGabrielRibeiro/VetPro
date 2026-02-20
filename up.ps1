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

Start-DockerDesktopIfNeeded

docker compose up --build -d
Assert-LastExitCode "Falha ao executar 'docker compose up --build -d'."

Write-Host ""
Write-Host "OK. Acesse:" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5000"
