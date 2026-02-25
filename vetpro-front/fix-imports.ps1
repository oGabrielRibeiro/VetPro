# Fix App.jsx - Add useMemo and useRef imports
$filePath = "vetpro-front\src\App.jsx"
$content = Get-Content $filePath -Raw
$newContent = $content -replace 'import React, \{ useState, useEffect, useCallback, lazy, Suspense \} from "react";', 'import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from "react";'
Set-Content -Path $filePath -Value $newContent -NoNewline
Write-Host "Import updated successfully"
