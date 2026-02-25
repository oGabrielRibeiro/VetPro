# Fix all remaining symbols in App.jsx
$filePath = 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
$content = Get-Content $filePath -Raw -Encoding UTF8

# Fix <- symbols
$content = $content -replace '<-', '<-'

# Save
[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Fixed HTML entities!"

# Now fix the <- to AppIcon
$content = Get-Content $filePath -Raw -Encoding UTF8
$content = $content -replace '<span className="mr-2"><-</span> Voltar para Pacientes', '<AppIcon name="back" className="h-4 w-4 mr-2" /><span>Voltar para Pacientes</span>'
[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Fixed back button!"
