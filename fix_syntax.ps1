# Fix syntax error in App.jsx
$filePath = 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
$content = Get-Content $filePath -Raw -Encoding UTF8

# Fix the broken ternary operator on line ~436
$content = $content -replace 'Nova ConsultationInput\.id', '? consultationInput.id'

# Fix back button - use simple string replacement
$oldBackButton = '<span className="mr-2"><-</span> Voltar para Pacientes'
$newBackButton = '<AppIcon name="back" className="h-4 w-4 mr-2" /><span>Voltar para Pacientes</span>'
$content = $content.Replace($oldBackButton, $newBackButton)

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done!"
