#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

Write-Host "Subindo VetPro via Docker..." -ForegroundColor Cyan
docker compose up --build -d

Write-Host ""
Write-Host "OK. Acesse:" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5000"
