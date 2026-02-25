# Read line 1319 from App.jsx
$lines = Get-Content 'c:\Cliente\HSS\VetPro\vetpro-front\src\App.jsx'
for ($i = 1315; $i -le 1325; $i++) {
    Write-Host "Line $($i+1): $($lines[$i])"
}
