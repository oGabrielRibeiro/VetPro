# Fix line 1009 in App.jsx - replace back button arrow with AppIcon
$lines = Get-Content 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
$lines[1008] = $lines[1008] -replace '<-', '<AppIcon name="back" className="h-4 w-4 mr-2" />'
$lines | Set-Content 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx' -Encoding UTF8
Write-Host "Line fixed!"
