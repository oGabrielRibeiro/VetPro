#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $ProjectRoot "vetpro-backend"
$FrontendPath = Join-Path $ProjectRoot "vetpro-front"
$ReportsDir = Join-Path $ProjectRoot "security\reports"

function Invoke-AuditJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath
  )

  Push-Location $ProjectPath
  try {
    $output = npm audit --json 2>&1
    $jsonText = $output -join "`n"
    return $jsonText
  } finally {
    Pop-Location
  }
}

function Get-VulnerabilitySummary {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AuditJsonText
  )

  $parsed = $AuditJsonText | ConvertFrom-Json
  $vuln = $parsed.metadata.vulnerabilities
  return [PSCustomObject]@{
    total = [int]$vuln.total
    critical = [int]$vuln.critical
    high = [int]$vuln.high
    moderate = [int]$vuln.moderate
    low = [int]$vuln.low
  }
}

New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null

$today = Get-Date
$stamp = $today.ToString("yyyy-MM-dd")
$reportPath = Join-Path $ReportsDir "audit-$stamp.md"
$backendAuditJson = Invoke-AuditJson -ProjectPath $BackendPath
$frontendAuditJson = Invoke-AuditJson -ProjectPath $FrontendPath

$backendSummary = Get-VulnerabilitySummary -AuditJsonText $backendAuditJson
$frontendSummary = Get-VulnerabilitySummary -AuditJsonText $frontendAuditJson

$md = @"
# Security Audit - $stamp

## Backend (vetpro-backend)
- Total: $($backendSummary.total)
- Critical: $($backendSummary.critical)
- High: $($backendSummary.high)
- Moderate: $($backendSummary.moderate)
- Low: $($backendSummary.low)

## Frontend (vetpro-front)
- Total: $($frontendSummary.total)
- Critical: $($frontendSummary.critical)
- High: $($frontendSummary.high)
- Moderate: $($frontendSummary.moderate)
- Low: $($frontendSummary.low)

## Acao recomendada
- Se houver vulnerabilidades high/critical, abrir item no TODO-LIST.md e atualizar docs/SECURITY-RISK-REGISTER.md com dono e prazo.
"@

Set-Content -Path $reportPath -Value $md -Encoding UTF8

Write-Host "Relatorio gerado em: $reportPath" -ForegroundColor Green
Write-Host "Backend total: $($backendSummary.total) | Frontend total: $($frontendSummary.total)"
