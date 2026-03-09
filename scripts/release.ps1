param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [string]$Date = (Get-Date -Format "yyyy-MM-dd"),
  [switch]$WithGit,
  [string]$CommitMessage = "",
  [switch]$AllowDirtyGit
)

$ErrorActionPreference = "Stop"

function Update-PackageVersion {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$NewVersion
  )

  $json = Get-Content $Path -Raw | ConvertFrom-Json
  $json.version = $NewVersion
  $json | ConvertTo-Json -Depth 100 | Set-Content $Path -Encoding UTF8
}

function Update-Changelog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$NewVersion,
    [Parameter(Mandatory = $true)]
    [string]$ReleaseDate
  )

  $content = Get-Content $Path -Raw
  if ($content -notmatch "## \[Unreleased\]") {
    throw "Bloco 'Unreleased' nao encontrado em $Path"
  }

  $newSection = @"
## [$NewVersion] - $ReleaseDate

### Added
- N/A

### Changed
- N/A

### Fixed
- N/A

### Security
- N/A

"@

  $updated = $content -replace "## \[Unreleased\]\r?\n", "## [Unreleased]`r`n`r`n$newSection"
  Set-Content $Path -Value $updated -Encoding UTF8
}

function Assert-GitAvailable {
  $null = Get-Command git -ErrorAction Stop
}

function Get-GitStatusShort {
  return git status --porcelain
}

function Ensure-GitTagDoesNotExist {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TagName
  )
  $existing = git tag --list $TagName
  if ($existing) {
    throw "A tag '$TagName' ja existe."
  }
}

if ($Version -notmatch "^\d+\.\d+\.\d+$") {
  throw "Versao invalida. Use formato SemVer: X.Y.Z"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendPkg = Join-Path $root "vetpro-backend/package.json"
$frontPkg = Join-Path $root "vetpro-front/package.json"
$changelog = Join-Path $root "CHANGELOG.md"

Update-PackageVersion -Path $backendPkg -NewVersion $Version
Update-PackageVersion -Path $frontPkg -NewVersion $Version
Update-Changelog -Path $changelog -NewVersion $Version -ReleaseDate $Date

if ($WithGit) {
  Assert-GitAvailable
  Set-Location $root

  $dirtyBefore = Get-GitStatusShort
  if ($dirtyBefore -and -not $AllowDirtyGit) {
    throw "Repositorio com alteracoes pendentes. Use -AllowDirtyGit para continuar mesmo assim."
  }

  $tagName = "v$Version"
  Ensure-GitTagDoesNotExist -TagName $tagName

  if (-not $CommitMessage) {
    $CommitMessage = "chore(release): $Version"
  }

  git add CHANGELOG.md vetpro-backend/package.json vetpro-front/package.json
  git commit -m $CommitMessage
  git tag $tagName
}

Write-Host "Release preparada com sucesso:"
Write-Host " - Versao: $Version"
Write-Host " - Data: $Date"
Write-Host " - Atualizados: CHANGELOG.md, vetpro-backend/package.json, vetpro-front/package.json"
if ($WithGit) {
  Write-Host " - Commit criado e tag gerada: v$Version"
} else {
  Write-Host " - Git nao executado (use -WithGit para commit + tag automatica)"
}
