// Conta marcos, parte B: Perfil e subpáginas, Configurações, textos, notificações, o Painel
// do administrador, as folhas de conta (instalar, completar cadastro, consentimento,
// privacidade, trocar senha, apagar conta, seu caminho, semeador), Explorar, seção, nota,
// busca e Apoiar.
import { clic, f, expandir } from './comum.mjs';
const rotas = [
  { nome: 'perfil', hash: '#/perfil' },
  { nome: 'conquistas', hash: '#/perfil/conquistas' },
  { nome: 'trofeus', hash: '#/perfil/trofeus' },
  { nome: 'versiculos', hash: '#/perfil/versiculos' },
  { nome: 'escritos', hash: '#/perfil/escritos' },
  { nome: 'livros', hash: '#/perfil/livros' },
  { nome: 'historia', hash: '#/perfil/historia' },
  { nome: 'config', hash: '#/config' },
  { nome: 'textos', hash: '#/config/textos' },
  { nome: 'notif', hash: '#/config/notificacoes', espera: 2400 },
  { nome: 'painel', hash: '#/config/painel', espera: 2600, segs: 12 },
  { nome: 'f-instalar', hash: '#/config', acao: f('CC.tutorialInstalar()'), rolar: '.folha' },
  { nome: 'f-cadastro', hash: '#/config', acao: f('CC.completarCadastro(CC.quem)'), rolar: '.folha' },
  { nome: 'f-consent', hash: '#/config', acao: f('CC.pedirConsentimento()'), rolar: '.folha' },
  { nome: 'f-priv', hash: '#/config', acao: f('CC.abrirPrivacidade(CC.quem)'), rolar: '.folha' },
  { nome: 'f-senha', hash: '#/config', acao: f('CC.trocarSenha()'), rolar: '.folha' },
  { nome: 'f-apagar', hash: '#/config', acao: f("CC.apagarConta('marcos')"), rolar: '.folha' },
  { nome: 'f-caminho', hash: '#/config', acao: clic('[data-caminho]'), rolar: '.folha' },
  { nome: 'f-semeador', hash: '#/perfil', acao: clic('[data-abrir-semeador]'), rolar: '.folha' },
  { nome: 'explorar', hash: '#/explorar' },
  { nome: 'secao', hash: '#/secao/11%20-%20Pessoas', segs: 4 },
  { nome: 'nota', hash: '#/nota/11%20-%20Pessoas%2FDavi' },
  { nome: 'busca', hash: '#/busca/davi', segs: 4 },
  { nome: 'apoiar', hash: '#/apoiar' },
  { nome: 'f-pix', hash: '#/apoiar', acao: clic('[data-qr-pix]'), rolar: '.folha' },
];
export const trabalhos = expandir(rotas);
