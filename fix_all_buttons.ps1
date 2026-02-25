# Fix all button issues in App.jsx
$filePath = 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
$content = Get-Content $filePath -Raw -Encoding UTF8

# Fix 1: Replace "<span className="mr-2"><-</span> Voltar para Pacientes" with AppIcon
$content = $content -replace [regex]::Escape('<span className="mr-2"><-</span> Voltar para Pacientes'), '<AppIcon name="back" className="h-4 w-4 mr-2" /><span>Voltar para Pacientes</span>'

# Fix 2: Replace "? Primeira Consulta" with "Primeira Consulta"  
$content = $content -replace '\? Primeira Consulta', 'Primeira Consulta'

# Fix 3: Replace "? Nova Consulta" with "Nova Consulta"
$content = $content -replace '\? Nova Consulta', 'Nova Consulta'

# Fix 4: Replace "? Cancelar" with "Cancelar"  
$content = $content -replace '\? Cancelar', 'Cancelar'

# Fix 5: Replace "? Salvar ?" with "Salvar"
$content = $content -replace 'Salvar \?', 'Salvar'

# Fix 6: Replace "? Consulta" with "Nova Consulta"
$content = $content -replace '\? Consulta', 'Nova Consulta'

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done!"
