# Fix back button using PowerShell script
$filePath = 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
$content = Get-Content $filePath -Raw -Encoding UTF8

# The issue is the <- is HTML encoded
$searchPattern = '<span className="mr-2"><-</span> Voltar para Pacientes'
$replaceWith = '<AppIcon name="back" className="h-4 w-4 mr-2" /><span>Voltar para Pacientes</span>'

$newContent = $content -replace [regex]::Escape($searchPattern), $replaceWith

[System.IO.File]::WriteAllText($filePath, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Fixed!"
