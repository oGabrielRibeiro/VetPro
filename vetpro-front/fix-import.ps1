$content = Get-Content 'src/App.jsx' -Raw -Encoding UTF8
$content = $content -replace 'import React, \{ useState, useEffect, useCallback, lazy, Suspense \} from "react";', 'import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from "react";'
Set-Content -Path 'src/App.jsx' -Value $content -NoNewline -Encoding UTF8
Write-Host "Import updated successfully"
