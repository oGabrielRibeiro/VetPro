# Read lines 890-910 from App.jsx
$lines = Get-Content 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
for ($i = 889; $i -le 909; $i++) {
    Write-Host "Line $($i+1): $($lines[$i])"
}
