# Fix back button in App.jsx - exact match
$filePath = 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
$content = Get-Content $filePath -Raw -Encoding UTF8

# Try different escaping
$search = '<span className="mr-2"><-</span> Voltar para Pacientes'
$replace = '<AppIcon name="back" className="h-4 w-4 mr-2" /><span>Voltar para Pacientes</span>'

$content = $content.Replace($search, $replace)

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done!"
