# Read lines 1120-1140 from App.jsx
$lines = Get-Content 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
for ($i = 1119; $i -le 1139; $i++) {
    Write-Host "Line $($i+1): $($lines[$i])"
}
