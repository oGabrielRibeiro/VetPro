# Validacao UI/UX VetPro (Roteiro rapido)

Objetivo: garantir que os fluxos criticos estao consistentes em desktop e mobile,
com estados completos (`loading`, `empty`, `error`, `success`) e sem regressao visual.

## Fluxo real (fim a fim)
1. Login com credenciais validas.
2. Abrir `Pacientes` e criar um novo paciente.
3. Abrir o paciente e iniciar uma `Consulta` (Quick ou Campo).
4. Preencher campos minimos e salvar.
5. Gerar receita/PDF e abrir/baixar o arquivo.

## Estados por tela (checagem rapida)
- `Login`: erro de credencial, loading do botao, banner de feedback.
- `Dashboard`: loading dos cards, empty de pacientes e agenda, error.
- `Pacientes`: loading, empty, error, card de paciente.
- `Consultas`: loading, empty, error, CTA principal.
- `Agenda`: loading, empty, error, CTA principal.
- `Relatorios`: skeletons, empty, error.
- `Perfil`: erro/sucesso de salvar e deletar.

## Tamanhos de tela (regressao)
Validar layout e CTA sem sobreposicao em:
- Mobile: `360x780` e `390x844`
- Tablet: `768x1024`
- Desktop: `1366x768` e `1440x900`

## Itens de contraste
- Texto secundario e muted legivel no dark mode.
- Inputs e placeholders legiveis no dark mode.
- Alertas de erro/info legiveis no dark mode.

## Evidencias
Registrar uma linha por tela (data + observacao):
- `Login`: ...
- `Dashboard`: ...
- `Pacientes`: ...
- `Consultas`: ...
- `Agenda`: ...
- `Relatorios`: ...
- `Perfil`: ...

