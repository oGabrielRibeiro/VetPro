# Release Flow (VetPro)

## Objetivo
Padronizar changelog e facilitar atualizacoes sem esquecer passos.

## Padrao
- Changelog central em [CHANGELOG.md](/c:/Cliente/HSS/VetPro/CHANGELOG.md)
- Versionamento semantico: `MAJOR.MINOR.PATCH`
- Versao sincronizada em:
- `vetpro-backend/package.json`
- `vetpro-front/package.json`

## Fluxo rapido
1. Atualize o bloco `Unreleased` no changelog durante o desenvolvimento.
2. Gere release com script:
```powershell
pwsh .\scripts\release.ps1 -Version 1.1.0
```
Ou com commit + tag automáticos:
```powershell
pwsh .\scripts\release.ps1 -Version 1.1.0 -WithGit
```
Opcional (mensagem customizada):
```powershell
pwsh .\scripts\release.ps1 -Version 1.1.0 -WithGit -CommitMessage "chore(release): 1.1.0"
```
3. Rode validacoes:
```powershell
# backend
cd vetpro-backend
npm test -- --runInBand

# frontend
cd ..\vetpro-front
npm run build
```
4. Commit + tag:
```powershell
git add CHANGELOG.md vetpro-backend/package.json vetpro-front/package.json
git commit -m "chore(release): 1.1.0"
git tag v1.1.0
```
Se usar `-WithGit`, esse passo ja e feito automaticamente.

## Checklist de release 1.0
Antes de publicar `1.0.0`, garantir:
- `TODO-UI-UX.md` concluido e validado.
- `TODO-AUDIO-IA-PARSER.md` com validacao final clinica multi-especie.
- Roteiro de uso real executado (login -> paciente -> consulta -> receita/PDF).
- Treinamento do time para registrar mudancas no `CHANGELOG.md` por PR.
- Rodar validacoes:
```powershell
cd vetpro-backend
npm run verify:local

cd ..\vetpro-front
npm run build
npm run test
```
Para finalizar a publicacao:
- Mover `Unreleased` para `1.0.0` (data atual).
- Atualizar versoes em `package.json`.
- Executar `scripts/release.ps1 -Version 1.0.0 -WithGit`.

## Dicas
- Patch (`1.0.x`): bugfix sem quebrar compatibilidade.
- Minor (`1.x.0`): nova funcionalidade compatível.
- Major (`x.0.0`): quebra de compatibilidade.
