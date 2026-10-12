"""Gera o fundo em relevo (cores hipsométricas) de um mapa do atlas: conteudo/atlas/relevo/<slug>.webp.

Decisão do dono (12/10): os mapas seguem a convenção clássica dos atlas bíblicos impressos,
com o mar azul em faixas de profundidade e a terra do verde das baixadas ao marrom das serras.
Tudo é desenhado por nós a partir de dados abertos; nada é copiado de outra Bíblia.

Dados:
- elevação e profundidade: Terrain Tiles (AWS Open Data, formato terrarium), que juntam
  SRTM, GMTED2010 e ETOPO1 (dados públicos dos EUA); baixados por zoom e guardados num cache
  fora do repositório;
- costa e lagos: conteudo/atlas/geo.json (Natural Earth, domínio público), os mesmos que o SVG
  desenha por cima, para a cor da terra bater com o contorno.

Uso (fora do build: o build só copia o .webp pronto):
  PYTHONPATH=<pasta com numpy> python3 ferramentas/atlas-relevo.py <slug> <pasta de cache>
Precisa de numpy e Pillow com WebP. A projeção é a mesma de ferramentas/atlas.mjs
(equirretangular com cos φ0, 400 unidades de largura); a imagem tem 4 px por unidade.
"""
import io
import json
import math
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PASTA = os.path.join(RAIZ, 'conteudo', 'atlas')
LARGURA = 400
PX = 4  # pixels por unidade do mapa

# cores (metros): terra das baixadas ao alto, mar do raso ao fundo
TERRA = [(-430, (104, 150, 92)), (-1, (122, 168, 104)), (0, (142, 186, 120)), (150, (163, 199, 131)), (350, (196, 214, 141)),
         (600, (228, 222, 158)), (900, (233, 206, 141)), (1200, (219, 177, 113)), (1600, (197, 141, 86)),
         (2100, (166, 106, 64)), (2800, (134, 80, 48)), (4000, (104, 60, 38))]
MAR = [(0, (214, 236, 246)), (-150, (196, 226, 242)), (-600, (176, 213, 236)), (-1500, (156, 199, 228)), (-2500, (138, 186, 221)), (-4000, (122, 172, 212))]
FAIXAS_MAR = [-150, -600, -1500, -2500]


def projecao(vista, largura=LARGURA):
    k = math.cos((vista['sul'] + vista['norte']) / 2 * math.pi / 180)
    esc = largura / ((vista['leste'] - vista['oeste']) * k)
    altura = round((vista['norte'] - vista['sul']) * esc * 10) / 10
    return k, esc, altura


def rampa(v, paradas):
    xs = np.array([p[0] for p in paradas], dtype=float)
    cs = np.array([p[1] for p in paradas], dtype=float)
    if xs[0] > xs[-1]:
        xs, cs = xs[::-1], cs[::-1]
    return np.stack([np.interp(v, xs, cs[:, i]) for i in range(3)], axis=-1)


def gauss(a, sigma):
    if sigma <= 0:
        return a
    r = int(sigma * 3) + 1
    x = np.arange(-r, r + 1)
    k = np.exp(-x * x / (2 * sigma * sigma))
    k /= k.sum()
    p = np.pad(a, r, mode='edge')
    p = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 0, p)
    p = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 1, p)
    return p


def tile(z, x, y, cache):
    os.makedirs(os.path.join(cache, str(z)), exist_ok=True)
    f = os.path.join(cache, str(z), '%d-%d.png' % (x, y))
    if not os.path.exists(f):
        url = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/%d/%d/%d.png' % (z, x, y)
        with urllib.request.urlopen(url, timeout=60) as r:
            open(f, 'wb').write(r.read())
    a = np.asarray(Image.open(f).convert('RGB'), dtype=float)
    return a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768


def elevacao(lon, lat, z, cache):
    """Amostra bilinear da elevação nos pontos (lon, lat), em Web Mercator no zoom z."""
    n = 2 ** z
    fx = (lon + 180) / 360 * n * 256
    lr = np.radians(lat)
    fy = (1 - np.log(np.tan(lr) + 1 / np.cos(lr)) / math.pi) / 2 * n * 256
    x0, x1 = int(fx.min() // 256), int(fx.max() // 256)
    y0, y1 = int(fy.min() // 256), int(fy.max() // 256)
    mosaico = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256))
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            mosaico[(ty - y0) * 256:(ty - y0 + 1) * 256, (tx - x0) * 256:(tx - x0 + 1) * 256] = tile(z, tx, ty, cache)
    px = np.clip(fx - x0 * 256 - .5, 0, mosaico.shape[1] - 1.001)
    py = np.clip(fy - y0 * 256 - .5, 0, mosaico.shape[0] - 1.001)
    ix, iy = px.astype(int), py.astype(int)
    dx, dy = px - ix, py - iy
    a = mosaico[iy, ix]; b = mosaico[iy, ix + 1]; c = mosaico[iy + 1, ix]; d = mosaico[iy + 1, ix + 1]
    return a * (1 - dx) * (1 - dy) + b * dx * (1 - dy) + c * (1 - dx) * dy + d * dx * dy


def main():
    slug, cache = sys.argv[1], sys.argv[2]
    m = json.load(open(os.path.join(PASTA, slug + '.json'), encoding='utf-8'))
    geo = json.load(open(os.path.join(PASTA, 'geo.json'), encoding='utf-8'))
    v = m['vista']
    k, esc, altura = projecao(v)
    W, H = int(LARGURA * PX), int(round(altura * PX))
    # zoom: o pixel do mosaico um pouco menor que o da imagem
    graus_px = (v['leste'] - v['oeste']) / W
    z = max(3, min(12, int(math.ceil(math.log2(360 / (256 * graus_px * 1.2))))))
    xs = (np.arange(W) + .5) / PX
    ys = (np.arange(H) + .5) / PX
    lon = v['oeste'] + xs / (k * esc)
    lat = v['norte'] - ys / esc
    LON, LAT = np.meshgrid(lon, lat)
    elev = elevacao(LON, LAT, z, cache)
    # no mar, a profundidade vem de um zoom baixo: no alto, alguns ladrilhos trazem 0 em vez do fundo
    prof_baixa = elevacao(LON, LAT, min(z, 6), cache)
    elev = gauss(elev, 2.2)
    prof_baixa = gauss(prof_baixa, 3)

    # terra e lagos pelo Natural Earth, na mesma projeção do SVG
    def P(p):
        return ((p[0] - v['oeste']) * k * esc * PX, (v['norte'] - p[1]) * esc * PX)
    mascara = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mascara)
    for anel in geo['terra']:
        d.polygon([P(p) for p in anel], fill=255)
    for anel in geo['lagos']:
        d.polygon([P(p) for p in anel], fill=0)
    terra = np.asarray(mascara, dtype=float) / 255
    # borda suave de 1 px, para a cor não serrilhar sob a linha da costa
    terra = np.asarray(mascara.filter(ImageFilter.GaussianBlur(.7)), dtype=float) / 255

    # terra: rampa contínua misturada com a mesma rampa em faixas (o ar de atlas impresso)
    alt = np.where(elev > -430, elev, -430)
    continua = rampa(alt, TERRA)
    degraus = np.array([-430, -1, 0, 150, 350, 600, 900, 1200, 1600, 2100, 2800])
    idx = np.clip(np.searchsorted(degraus, alt, side='right') - 1, 0, len(degraus) - 1)
    faixas = rampa(degraus[idx].astype(float), TERRA)
    faixas = np.stack([gauss(faixas[:, :, i], 1.5) for i in range(3)], axis=-1)
    cor_terra = continua * .45 + faixas * .55

    # sombreado: luz de noroeste, relevo exagerado para ler na tela do celular
    metros_px = esc and (111200 / esc) / PX
    e = gauss(np.where(terra > .5, np.maximum(elev, 0), 0), 3.5)
    gy, gx = np.gradient(e, metros_px)
    exag = float(m.get('relevoExagero', 4))
    nx, ny, nz = -gx * exag, gy * exag, np.ones_like(e)
    norma = np.sqrt(nx * nx + ny * ny + nz * nz)
    az, al = math.radians(315), math.radians(45)
    lx, ly, lz = math.cos(al) * math.sin(az), math.cos(al) * math.cos(az), math.sin(al)
    luz = (nx * lx + ny * ly + nz * lz) / norma
    sombra = np.clip(1 + .75 * (luz - math.sin(al)), .68, 1.12)
    cor_terra = np.clip(cor_terra * sombra[:, :, None], 0, 255)

    # mar: faixas de profundidade suaves; o raso da beira vem da própria costa
    prof = np.minimum(prof_baixa, -1)
    di = np.clip(np.searchsorted(-np.array(FAIXAS_MAR), -prof, side='right'), 0, len(FAIXAS_MAR))
    nivel = np.array([0, -150, -600, -1500, -2500], dtype=float)[di]
    cor_mar = rampa(nivel, MAR)
    cor_mar = np.stack([gauss(cor_mar[:, :, i], 2.2) for i in range(3)], axis=-1)

    t = terra[:, :, None]
    img = cor_terra * t + cor_mar * (1 - t)
    saida = os.path.join(PASTA, 'relevo')
    os.makedirs(saida, exist_ok=True)
    arq = os.path.join(saida, slug + '.webp')
    Image.fromarray(img.astype(np.uint8)).save(arq, 'WEBP', quality=84, method=6)
    print(arq, W, 'x', H, 'zoom', z, round(os.path.getsize(arq) / 1024, 1), 'KB')


if __name__ == '__main__':
    main()
