# Gera os icones do aplicativo a partir da arte em arte/icone-app.png.
#
# Roda no Windows, uma vez, sempre que a arte mudar:
#   powershell -ExecutionPolicy Bypass -File ferramentas\icones.ps1
#
# Os PNGs saem em src/icones/ e o build so os copia. Redimensionar exige decodificar
# PNG, e o projeto nao tem dependencias: por isso a reducao acontece aqui, com o
# System.Drawing que ja vem no Windows, e nao dentro do build (que roda no Docker).
#
# Tres familias:
#   icone-N.png          quadrado arredondado com cantos transparentes (favicon, desktop)
#   icone-mascara-N.png  fundo cheio e desenho encolhido para a zona segura de 80% que o
#                        Android recorta em circulo, gota ou quadrado
#   apple-touch-icon.png fundo cheio: o iPhone pinta de preto o que for transparente e
#                        arredonda os cantos por conta propria
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$origem = Join-Path $raiz 'arte\icone-app.png'
$saida = Join-Path $raiz 'src\icones'
New-Item -ItemType Directory -Force $saida | Out-Null

$arte = [System.Drawing.Bitmap]::FromFile($origem)

# Onde esta o quadrado arredondado dentro da arte: a primeira e a ultima linha/coluna
# opacas, medidas no meio. O resto da tela e transparente.
$meio = [int]($arte.Width / 2)
$esq = 0; for ($x = 0; $x -lt $meio; $x++) { if ($arte.GetPixel($x, $meio).A -gt 200) { $esq = $x; break } }
$dir = 0; for ($x = $arte.Width - 1; $x -gt $meio; $x--) { if ($arte.GetPixel($x, $meio).A -gt 200) { $dir = $x; break } }
$topo = 0; for ($y = 0; $y -lt $meio; $y++) { if ($arte.GetPixel($meio, $y).A -gt 200) { $topo = $y; break } }
$base = 0; for ($y = $arte.Height - 1; $y -gt $meio; $y--) { if ($arte.GetPixel($meio, $y).A -gt 200) { $base = $y; break } }

# recorte quadrado centrado no quadrado arredondado, com folga de 2% para a borda
# antisserrilhada nao ser cortada
$lado = [Math]::Max($dir - $esq, $base - $topo) * 1.02
$cx = ($esq + $dir) / 2
$cy = ($topo + $base) / 2
$recorte = New-Object System.Drawing.RectangleF(($cx - $lado / 2), ($cy - $lado / 2), $lado, $lado)

# a cor do fundo da propria arte, lida bem dentro do quadrado, para o fundo cheio emendar
$fundo = $arte.GetPixel([int]($esq + ($dir - $esq) * 0.08), [int]$cy)
$fundo = [System.Drawing.Color]::FromArgb(255, $fundo.R, $fundo.G, $fundo.B)

function Gerar([int]$tamanho, [double]$escala, [bool]$cheio, [string]$nome) {
  $img = New-Object System.Drawing.Bitmap($tamanho, $tamanho, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($img)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  if ($cheio) { $g.Clear($fundo) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  $lado = $tamanho * $escala
  $pos = ($tamanho - $lado) / 2
  $destino = New-Object System.Drawing.RectangleF($pos, $pos, $lado, $lado)
  $g.DrawImage($arte, $destino, $recorte, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $caminho = Join-Path $saida $nome
  $img.Save($caminho, [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose()
  '{0,-26} {1,4}px  {2,6:N0} KB' -f $nome, $tamanho, ((Get-Item $caminho).Length / 1KB)
}

Gerar 48  1.00 $false 'icone-48.png'
Gerar 192 1.00 $false 'icone-192.png'
Gerar 512 1.00 $false 'icone-512.png'
# 0.72: as orelhas, que sao o ponto mais afastado do centro, ficam dentro do circulo
# de 80% que o Android garante mostrar
Gerar 192 0.72 $true  'icone-mascara-192.png'
Gerar 512 0.72 $true  'icone-mascara-512.png'
Gerar 180 0.92 $true  'apple-touch-icon.png'

$arte.Dispose()
'fundo da arte: #{0:x2}{1:x2}{2:x2}' -f $fundo.R, $fundo.G, $fundo.B
