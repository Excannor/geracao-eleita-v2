// Desenha o ícone do aplicativo e devolve um PNG. Sem dependências: o Node já traz
// o zlib, e um PNG é só IHDR + IDAT comprimido + IEND com CRC em cada bloco.
//
// O desenho: uma cruz branca plantada numa colina dourada, com duas colinas mais
// escuras atrás. Foi o único dos desenhos tentados que continua legível a 48px:
// caminhos finos e contas soltas viram borrão nesse tamanho.
import { deflateSync } from 'node:zlib';

const TABELA = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABELA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function bloco(tipo, dados) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const soma = Buffer.alloc(4);
  soma.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, soma]);
}

function png(largura, altura, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;   // bits por canal
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(pixels, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- formas, em coordenadas 0..1 ----------
function retanguloRedondo(x, y, x0, y0, x1, y1, r) {
  if (x >= x0 && x <= x1 && y >= y0 + r && y <= y1 - r) return true;
  if (y >= y0 && y <= y1 && x >= x0 + r && x <= x1 - r) return true;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const disco = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// ---------- a composição ----------
const FUNDO_ALTO = [255, 92, 80];
const FUNDO_BAIXO = [163, 9, 22];
const COLINA = [252, 202, 8];
const COLINA_FUNDO = [221, 163, 0];
const CRUZ = [255, 255, 255];

// Cruz latina: haste longa, travessa no terço de cima e o pé enterrado na colina.
// Barras de larguras parecidas viram um sinal de "mais", não uma cruz.
const cruz = (x, y) =>
  retanguloRedondo(x, y, 0.452, 0.115, 0.548, 0.760, 0.024)
  || retanguloRedondo(x, y, 0.332, 0.238, 0.668, 0.334, 0.024);

// As colinas são desenhadas como calotas de círculos grandes, para a linha do
// horizonte ser curva sem precisar de curva de Bézier nenhuma.
const colinaFrente = (x, y) => disco(x, y, 0.50, 1.62, 0.98);
const colinasFundo = (x, y) => disco(x, y, 0.14, 1.38, 0.74) || disco(x, y, 0.92, 1.42, 0.72);

function degrade(x, y) {
  const t = Math.max(0, Math.min(1, x * 0.35 + y * 0.65));
  return [
    Math.round(FUNDO_ALTO[0] + (FUNDO_BAIXO[0] - FUNDO_ALTO[0]) * t),
    Math.round(FUNDO_ALTO[1] + (FUNDO_BAIXO[1] - FUNDO_ALTO[1]) * t),
    Math.round(FUNDO_ALTO[2] + (FUNDO_BAIXO[2] - FUNDO_ALTO[2]) * t),
  ];
}

// `escala` menor encolhe só a cruz, para ela caber na área que o Android não corta
// quando usa o ícone como maskable. As colinas continuam presas às bordas: encolhê-las
// deixaria uma faixa vermelha embaixo, e o desenho perderia o chão.
function cor(x, y, escala) {
  const qx = 0.5 + (x - 0.5) / escala;
  const qy = 0.5 + (y - 0.5) / escala;
  if (cruz(qx, qy)) return CRUZ;
  if (colinaFrente(x, y)) return COLINA;
  if (colinasFundo(x, y)) return COLINA_FUNDO;
  return degrade(x, y);
}

export function iconePng(tamanho, escala = 1) {
  const linha = tamanho * 4 + 1;
  const pixels = Buffer.alloc(linha * tamanho);
  const AMOSTRAS = 4;
  const n = AMOSTRAS * AMOSTRAS;
  for (let y = 0; y < tamanho; y++) {
    const base = y * linha;
    pixels[base] = 0; // filtro "nenhum"
    for (let x = 0; x < tamanho; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const c = cor((x + (sx + 0.5) / AMOSTRAS) / tamanho,
            (y + (sy + 0.5) / AMOSTRAS) / tamanho, escala);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const p = base + 1 + x * 4;
      pixels[p] = Math.round(r / n);
      pixels[p + 1] = Math.round(g / n);
      pixels[p + 2] = Math.round(b / n);
      pixels[p + 3] = 255;
    }
  }
  return png(tamanho, tamanho, pixels);
}
