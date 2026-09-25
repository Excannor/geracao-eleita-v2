# Publica o último commit no servidor de produção (Raspberry Pi, https://ge.off-sec.net).
#
# Uso, de dentro desta pasta:   .\publicar.ps1
#
# Vai só o que está commitado: mudança sem commit não sobe, para o que está no ar ser sempre
# um commit conhecido. dados/ e .env do Pi não são tocados (o git archive não os leva).
$ErrorActionPreference = 'Stop'
$pi    = 'pi@192.168.1.34'
$chave = Join-Path $HOME '.ssh\id_ed25519_pi'
$ssh   = @('-i', $chave, '-o', 'ConnectTimeout=10')
Set-Location $PSScriptRoot

if (git status --porcelain -- src conteudo arte *.mjs Dockerfile docker-compose.yml) {
  Write-Host 'Há mudanças sem commit. Faça o commit antes de publicar.' -ForegroundColor Yellow
  git status --short; exit 1
}
$commit = git log --oneline -1
Write-Host "Publicando: $commit"

# Arquivo em vez de pipe: o PowerShell 5 corrompe dados binários em pipe para programas externos.
$tar = Join-Path $env:TEMP 'geracao-eleita-publicar.tar'
git archive --format=tar -o $tar HEAD
scp @ssh $tar "${pi}:/tmp/publicar.tar"
if ($LASTEXITCODE) { throw 'Não consegui copiar para o Pi (ele está ligado na rede?)' }
Remove-Item $tar

# Recriar o app derruba a pilha de rede do túnel. No Docker do Pi um simples restart do túnel
# falha ("No such container"), porque ele segue preso ao container antigo: tem que recriar.
ssh @ssh $pi 'cd ~/geracao-eleita && tar -xf /tmp/publicar.tar && rm /tmp/publicar.tar && sudo docker compose up -d --build caminho 2>&1 | tail -2 && sudo docker compose up -d --force-recreate tunel-fixo 2>&1 | tail -1'
if ($LASTEXITCODE) { throw 'O build ou a subida no Pi falhou' }

Start-Sleep 8
try {
  $r = Invoke-WebRequest 'https://ge.off-sec.net/' -UseBasicParsing -TimeoutSec 20
  Write-Host "No ar: HTTP $($r.StatusCode) com $commit" -ForegroundColor Green
} catch {
  Write-Host "O site não respondeu ainda: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Espere uns segundos e abra https://ge.off-sec.net; se continuar fora, veja: ssh -i ~/.ssh/id_ed25519_pi pi@192.168.1.34 "cd geracao-eleita && sudo docker compose logs --tail 30"'
  exit 1
}
