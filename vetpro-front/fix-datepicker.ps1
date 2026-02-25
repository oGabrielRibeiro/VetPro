# Fix DatePicker.jsx - handleOnChange compatibility with React Hook Form
$filePath = "vetpro-front\src\components\DatePicker.jsx"
$content = Get-Content $filePath -Raw

$oldCode = @'
  // Função para chamar onChange de forma segura
  const handleOnChange = (newValue) => {
    if (onChange) {
      // Se onChange é uma função do react-hook-form (espera evento)
      if (typeof onChange === 'object' && onChange !== null && typeof onChange.target === 'object') {
        // É um evento synthetic
        onChange(newValue);
      } else if (typeof onChange === 'function') {
        // É uma função direta
        onChange(newValue);
      }
    }
  };
'@

$newCode = @'
  // Função para chamar onChange de forma segura - compatível com React Hook Form
  const handleOnChange = (newValue) => {
    if (onChange && typeof onChange === 'function') {
      // React Hook Form espera um evento com target.value
      onChange({ target: { value: newValue } });
    }
  };
'@

$content = $content.Replace($oldCode, $newCode)
Set-Content -Path $filePath -Value $content -NoNewline
Write-Host "DatePicker fix applied"
