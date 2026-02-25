$content = Get-Content 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx' -Raw -Encoding UTF8
$newContent = $content -replace [regex]::Escape('<span className="mr-2"><-</span> Voltar para Pacientes'), '<AppIcon name="back" className="h-4 w-4 mr-2" />'
[System.IO.File]::WriteAllText('c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx', $newContent, [System.Text.Encoding]::UTF8)
