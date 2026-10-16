/* Retrato do Brasil — mapa de estatísticas oficiais */
(() => {
'use strict';

const API = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const REGIOES = { 1: 'Norte', 2: 'Nordeste', 3: 'Sudeste', 4: 'Sul', 5: 'Centro-Oeste' };
const ZOOM_MUN = 3.2; // a partir deste zoom os municípios aparecem sozinhos

// ---------- indicadores ----------
const GRUPOS = {
  pop: { nome: 'População', cor: '#1f7a6b' },
  eco: { nome: 'Economia e renda', cor: '#2c5a9e' },
  des: { nome: 'Desenvolvimento', cor: '#b5651d' },
  san: { nome: 'Saneamento', cor: '#1b8aa8' },
  seg: { nome: 'Segurança', cor: '#b8323a' },
  ele: { nome: 'Eleições 2026', cor: '#6b4aa0' },
};

let IND = []; // montado depois de carregar os dados (nomes dos candidatos)
function montarIndicadores(G) {
  const c = G.candidatos, [a, b] = G.segundo_turno;
  const nome = n => c[n].nome.replace(/\b(De|Da|Do|Dos|Das)\b/g, s => s.toLowerCase());
  IND = [
    { k: 'pop', g: 'pop', nome: 'População', f: 'int', desc: `Estimativa do IBGE para 1º de julho de ${G.periodos.pop}.`, fonte: 'est' },
    { k: 'pop22', g: 'pop', nome: 'População no Censo 2022', f: 'int', desc: 'Pessoas contadas pelo Censo Demográfico 2022.', fonte: 'censo' },
    { k: 'pct_mulheres', g: 'pop', nome: 'Mulheres', f: 'pct', desc: 'Parcela de mulheres na população (Censo 2022).', fonte: 'censo' },
    { k: 'homens', g: 'pop', nome: 'Homens', f: 'int', desc: 'Número de homens (Censo 2022).', fonte: 'censo' },
    { k: 'mulheres', g: 'pop', nome: 'Mulheres (número)', f: 'int', desc: 'Número de mulheres (Censo 2022).', fonte: 'censo' },
    { k: 'dens', g: 'pop', nome: 'Densidade demográfica', f: 'dens', desc: 'Habitantes por km², com a estimativa de população mais recente.', fonte: 'est' },
    { k: 'idade_med', g: 'pop', nome: 'Idade mediana', f: 'anos', desc: 'Metade da população tem menos que essa idade (Censo 2022).', fonte: 'censo' },
    { k: 'envelh', g: 'pop', nome: 'Índice de envelhecimento', f: 'dec1', desc: 'Pessoas com 65 anos ou mais para cada 100 com até 14 anos (Censo 2022).', fonte: 'censo' },
    { k: 'parda', g: 'pop', nome: 'Pessoas pardas', f: 'pct', desc: 'Parcela que se declarou parda (Censo 2022).', fonte: 'censo' },
    { k: 'branca', g: 'pop', nome: 'Pessoas brancas', f: 'pct', desc: 'Parcela que se declarou branca (Censo 2022).', fonte: 'censo' },
    { k: 'preta', g: 'pop', nome: 'Pessoas pretas', f: 'pct', desc: 'Parcela que se declarou preta (Censo 2022).', fonte: 'censo' },
    { k: 'indigena', g: 'pop', nome: 'Pessoas indígenas', f: 'pct', desc: 'Parcela que se declarou indígena (Censo 2022).', fonte: 'censo' },
    { k: 'amarela', g: 'pop', nome: 'Pessoas amarelas', f: 'pct', desc: 'Parcela que se declarou amarela (Censo 2022).', fonte: 'censo' },
    { k: 'pib', g: 'eco', nome: 'PIB nominal', f: 'brl', desc: `Produto Interno Bruto a preços correntes de ${G.periodos.pib}.`, fonte: 'pib' },
    { k: 'pib_pc', g: 'eco', nome: 'PIB per capita', f: 'brl', desc: `PIB de ${G.periodos.pib} dividido pela população do Censo 2022.`, fonte: 'pib' },
    { k: 'renda', g: 'eco', nome: 'Renda média por pessoa', f: 'brl2', desc: 'Rendimento domiciliar mensal médio por morador (Censo 2022).', fonte: 'censo' },
    { k: 'gini', g: 'eco', nome: 'Desigualdade (Gini)', f: 'idx', desc: 'Índice de Gini da renda por pessoa: 0 é igualdade total, 1 é desigualdade máxima (Censo 2022).', fonte: 'censo' },
    { k: 'idh', g: 'des', nome: 'IDH', f: 'idx', desc: 'Índice de Desenvolvimento Humano Municipal: Brasil e estados em 2024; municípios em 2010, o dado municipal mais recente.', fonte: 'idh' },
    { k: 'alfab', g: 'des', nome: 'Alfabetização', f: 'pct', desc: 'Pessoas de 15 anos ou mais que sabem ler e escrever (Censo 2022).', fonte: 'censo' },
    { k: 'vida', g: 'des', nome: 'Expectativa de vida', f: 'anos1', desc: 'Esperança de vida ao nascer em 2024.', fonte: 'vida' },
    { k: 'tmi', g: 'des', nome: 'Mortalidade infantil', f: 'mil', desc: 'Mortes antes de 1 ano de idade por mil nascidos vivos, em 2024.', fonte: 'vida' },
    { k: 'agua', g: 'san', nome: 'Água da rede geral', f: 'pct', desc: 'Domicílios que usam a rede geral como principal fonte de água (Censo 2022).', fonte: 'censo' },
    { k: 'esgoto', g: 'san', nome: 'Esgoto adequado', f: 'pct', desc: 'Domicílios ligados à rede geral ou pluvial de esgoto, direto ou por fossa (Censo 2022).', fonte: 'censo' },
    { k: 'homic', g: 'seg', nome: 'Taxa de homicídios', f: 'taxa', desc: `Homicídios por 100 mil habitantes: estados e Brasil em ${G.periodos.homic_uf}, municípios em ${G.periodos.homic_mun}.`, fonte: 'homic' },
    { k: 'eleitores', g: 'ele', nome: 'Eleitores', f: 'int', desc: 'Eleitores aptos a votar na eleição de 2026.', fonte: 'tse' },
    { k: 'comparec', g: 'ele', nome: 'Comparecimento', f: 'pct', desc: 'Eleitores que votaram no 1º turno de 2026.', fonte: 'tse' },
    { k: 'v' + a, g: 'ele', nome: `Votos em ${nome(a)}`, f: 'pct', desc: `Votos válidos para presidente no 1º turno de 2026 (${c[a].partido}).`, fonte: 'tse', cor: '#2f5fa7' },
    { k: 'v' + b, g: 'ele', nome: `Votos em ${nome(b)}`, f: 'pct', desc: `Votos válidos para presidente no 1º turno de 2026 (${c[b].partido}).`, fonte: 'tse', cor: '#c0392b' },
    { k: 'venc', g: 'ele', nome: 'Mais votado para presidente', f: 'cat', desc: 'Candidato com mais votos válidos no 1º turno de 2026.', fonte: 'tse' },
  ];
}
const VENC_COR = { 22: '#2f5fa7', 13: '#c0392b' };

const FONTES = {
  est: ['IBGE — Estimativas da População', 'https://sidra.ibge.gov.br/tabela/6579'],
  censo: ['IBGE — Censo Demográfico 2022', 'https://censo2022.ibge.gov.br/'],
  pib: ['IBGE — PIB dos Municípios', 'https://sidra.ibge.gov.br/tabela/5938'],
  idh: ['PNUD, Ipea e FJP — Radar IDHM 2026 (estados) e Atlas do Desenvolvimento Humano (municípios)', 'http://www.atlasbrasil.org.br/'],
  vida: ['IBGE — Projeções da População, revisão 2024', 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9109-projecao-da-populacao.html'],
  homic: ['Ipea e Fórum Brasileiro de Segurança Pública — Atlas da Violência', 'https://www.ipea.gov.br/atlasviolencia/'],
  tse: ['TSE — Resultados das Eleições 2026', 'https://dadosabertos.tse.jus.br/dataset/resultados-2026'],
};

// ---------- formatação ----------
const nf = (d) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });
const N0 = nf(0), N1 = nf(1), N2 = nf(2), N3 = nf(3);
function compacto(v) {
  const a = Math.abs(v);
  if (a >= 1e12) return N1.format(v / 1e12) + ' tri';
  if (a >= 1e9) return N1.format(v / 1e9) + ' bi';
  if (a >= 1e6) return N1.format(v / 1e6) + ' mi';
  if (a >= 1e4) return N1.format(v / 1e3) + ' mil';
  return N0.format(v);
}
function fmt(v, f, curto) {
  if (v == null || Number.isNaN(v)) return '—';
  switch (f) {
    case 'int': return curto ? compacto(v) : N0.format(v);
    case 'pct': return N1.format(v) + '%';
    case 'brl': return 'R$ ' + (curto || v >= 1e6 ? compacto(v) : N0.format(v));
    case 'brl2': return 'R$ ' + (curto ? N0.format(v) : N2.format(v));
    case 'idx': return N3.format(v);
    case 'dec1': return N1.format(v);
    case 'anos': return N0.format(v) + ' anos';
    case 'anos1': return N1.format(v) + ' anos';
    case 'dens': return N1.format(v) + (curto ? '' : ' hab/km²');
    case 'taxa': return N1.format(v) + (curto ? '' : ' por 100 mil');
    case 'mil': return N1.format(v) + (curto ? '' : ' por mil');
    case 'cat': return G.candidatos[v] ? G.candidatos[v].nome : String(v);
    default: return String(v);
  }
}
const sem = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- estado ----------
let G, M, COL, MUN = new Map();
const S = { ind: 'pop', div: 'uf', sel: 'BR', k: 1 };
const vivo = new Set(); // campos atualizados agora pela API

const nivel = key => key === 'BR' ? 'br' : key[0] === 'R' ? 'regiao' : key.length === 2 ? 'uf' : 'mun';
// fetch com nova tentativa: a API do IBGE às vezes falha na primeira
const pegar = (url, n = 3) => fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .catch(e => n > 1 ? new Promise(ok => setTimeout(ok, 600)).then(() => pegar(url, n - 1)) : Promise.reject(e));
const ufDe = key => nivel(key) === 'mun' ? key.slice(0, 2) : nivel(key) === 'uf' ? key : null;
function linha(key) {
  if (nivel(key) === 'mun') return MUN.get(key);
  return G.locais[key];
}
function val(key, campo) {
  const l = linha(key);
  return l ? l.v[COL[campo]] : null;
}
function nomeDe(key) {
  const l = linha(key);
  if (!l) return '';
  return nivel(key) === 'mun' ? `${l.nome} – ${G.locais[key.slice(0, 2)].sigla}` : l.nome;
}
const ind = () => IND.find(i => i.k === S.ind) || IND[0];
const UFS = () => Object.keys(G.locais).filter(k => /^\d\d$/.test(k));
const PARES = { br: () => ['BR'], regiao: () => ['R1', 'R2', 'R3', 'R4', 'R5'], uf: UFS, mun: () => [...MUN.keys()] };
function temDado(niv, campo) {
  return PARES[niv]().some(k => val(k, campo) != null);
}

// ---------- mapa ----------
const svg = d3.select('#svg');
const raiz = svg.append('g');
const gBase = raiz.append('g');
const gMun = raiz.append('g');
const gCont = raiz.append('g');
const gSel = raiz.append('g');
let proj, path, featUF, featReg, zoom, largura, altura;
const munCarregado = new Map(); // uf -> Promise<features>
const dica = document.getElementById('dica');

function dimensionar() {
  const r = document.getElementById('mapa').getBoundingClientRect();
  largura = r.width; altura = r.height;
  svg.attr('viewBox', `0 0 ${largura} ${altura}`);
  proj = d3.geoMercator().fitExtent([[16, 16], [largura - 16, altura - 16]], { type: 'FeatureCollection', features: featUF });
  path = d3.geoPath(proj);
  raiz.selectAll('path').attr('d', path);
}

function escala(niv) {
  const i = ind();
  if (i.f === 'cat') return v => VENC_COR[v] || '#8a8f8c';
  const vals = PARES[niv]().map(k => val(k, i.k)).filter(v => v != null);
  if (!vals.length) return null;
  const base = i.cor || GRUPOS[i.g].cor;
  const inicio = getComputedStyle(document.documentElement).getPropertyValue('--rampa').trim() || '#f1f4e6';
  const cores = d3.quantize(d3.interpolateLab(inicio, base), 6).concat([d3.color(base).darker(1.1).formatHex()]);
  const s = d3.scaleQuantile().domain(vals).range(cores);
  s.cores = cores;
  return s;
}

function munVisivel(uf) {
  if (!temDado('mun', S.ind)) return false;
  if (S.div === 'mun') return true;
  if (ufDe(S.sel) === uf) return true;
  return S.k >= ZOOM_MUN && ufNaTela(uf);
}
function ufNaTela(uf) {
  const f = featUF.find(f => f.properties.codarea === uf);
  const [[x0, y0], [x1, y1]] = path.bounds(f);
  const t = d3.zoomTransform(svg.node());
  const [a, b] = t.apply([x0, y0]), [c, d] = t.apply([x1, y1]);
  return c > 0 && a < largura && d > 0 && b < altura;
}

function carregarMun(uf) {
  if (!munCarregado.has(uf)) {
    munCarregado.set(uf, d3.json(`geo/mun/${uf}.json`).then(topo => {
      const obj = Object.values(topo.objects)[0];
      const feats = topojson.feature(topo, obj).features;
      gMun.append('g').attr('data-uf', uf).selectAll('path').data(feats).join('path')
        .attr('class', 'area mun').attr('d', path)
        .on('mousemove', mostrarDica).on('mouseleave', esconderDica)
        .on('click', (e, f) => selecionar(f.properties.codarea, true));
      return feats;
    }));
  }
  return munCarregado.get(uf);
}

let sMun, sBase;
async function desenhar() {
  const i = ind();
  const divBase = S.div === 'regiao' ? 'regiao' : 'uf';
  const baseTem = temDado(divBase, i.k);
  sBase = baseTem ? escala(divBase) : null;
  const feats = divBase === 'regiao' ? featReg : featUF;
  gBase.selectAll('path').data(feats, f => f.properties.codarea).join('path')
    .attr('class', 'area').attr('d', path)
    .on('mousemove', mostrarDica).on('mouseleave', esconderDica)
    .on('click', (e, f) => selecionar(f.properties.codarea, true))
    .attr('fill', f => { const v = val(f.properties.codarea, i.k); return v == null || !sBase ? 'var(--vazio)' : sBase(v); });

  // municípios
  const ufsMun = UFS().filter(munVisivel);
  sMun = ufsMun.length ? escala('mun') : null;
  const faltando = ufsMun.filter(u => !munCarregado.has(u));
  document.getElementById('carregando').hidden = !faltando.length;
  await Promise.all(ufsMun.map(carregarMun));
  document.getElementById('carregando').hidden = true;
  gMun.selectAll('g[data-uf]').attr('display', function () { return ufsMun.includes(this.dataset.uf) ? null : 'none'; });
  gMun.selectAll('g[data-uf]').filter(function () { return ufsMun.includes(this.dataset.uf); })
    .selectAll('path').attr('fill', f => { const v = val(f.properties.codarea, i.k); return v == null ? 'var(--vazio)' : sMun(v); });

  // contornos: estados por cima dos municípios, regiões por cima dos estados
  const cont = ufsMun.length ? featUF : S.div === 'uf' ? featReg : [];
  gCont.selectAll('path').data(cont, f => f.properties.codarea).join('path').attr('class', 'contorno').attr('d', path);

  desenharSel();
  legenda(ufsMun.length ? sMun : sBase);
  avisos(ufsMun.length > 0, baseTem, divBase);
}

function desenharSel() {
  const key = S.sel;
  let f = null;
  if (nivel(key) === 'uf') f = featUF.find(x => x.properties.codarea === key);
  else if (nivel(key) === 'regiao') f = featReg.find(x => x.properties.codarea === key);
  else if (nivel(key) === 'mun') {
    gMun.selectAll('path').each(function (d) { if (d.properties.codarea === key) f = d; });
  }
  gSel.selectAll('path').data(f ? [f] : []).join('path').attr('class', 'sel').attr('d', path);
}

function avisos(munNaTela, baseTem, divBase) {
  const i = ind(), el = document.getElementById('aviso');
  const msgs = [];
  if ((S.div === 'mun' || S.k >= ZOOM_MUN) && !temDado('mun', i.k)) msgs.push('Este indicador não é divulgado por município; o mapa mostra os estados.');
  if (!baseTem) msgs.push(divBase === 'regiao' ? 'Este indicador não é divulgado por região; escolha Estados para ver o mapa.' : 'Sem dados por estado.');
  if (i.k === 'idh' && munNaTela) msgs.push('No nível municipal o IDH é de 2010, o último calculado para municípios; estados e Brasil são de 2024.');
  if (i.k === 'homic' && munNaTela) msgs.push(`Nos municípios a taxa é de ${G.periodos.homic_mun}; em cidades pequenas, poucos casos mudam muito a taxa.`);
  if (!munNaTela && temDado('mun', i.k) && S.div !== 'mun') msgs.push('Aproxime o mapa ou clique num estado para ver os municípios.');
  el.textContent = msgs.join(' ');
  el.hidden = !msgs.length;
}

function legenda(s) {
  const el = document.getElementById('legenda'), i = ind();
  if (!s) { el.innerHTML = ''; return; }
  if (i.f === 'cat') {
    const [a, b] = G.segundo_turno;
    el.innerHTML = `<div class="cats">${[a, b].map(n => `<span><i style="background:${VENC_COR[n]}"></i>${G.candidatos[n].nome}</span>`).join('')}<span><i style="background:#8a8f8c"></i>Outros</span></div>`;
    return;
  }
  const q = s.quantiles(), ext = d3.extent(s.domain());
  const marcas = largura < 520 ? [ext[0], q[3], ext[1]] : [ext[0], q[1], q[3], q[5], ext[1]];
  el.innerHTML = `<div class="barra">${s.cores.map(c => `<span style="background:${c}"></span>`).join('')}</div>
    <div class="marcas">${marcas.map(m => `<span>${fmt(m, i.f, true)}</span>`).join('')}</div>`;
}

function mostrarDica(e, f) {
  const key = f.properties.codarea, i = ind();
  const [x, y] = d3.pointer(e, document.getElementById('mapa'));
  dica.innerHTML = `<b>${nomeDe(key)}</b>${i.nome}: ${fmt(val(key, i.k), i.f)}`;
  dica.hidden = false;
  const w = dica.offsetWidth;
  dica.style.left = Math.min(x + 14, largura - w - 8) + 'px';
  dica.style.top = (y + 14) + 'px';
}
function esconderDica() { dica.hidden = true; }

function enquadrar(key, dur = 750) {
  let f;
  if (key === 'BR') return svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity);
  if (nivel(key) === 'regiao') f = featReg.find(x => x.properties.codarea === key);
  else f = featUF.find(x => x.properties.codarea === ufDe(key));
  const [[x0, y0], [x1, y1]] = path.bounds(f);
  const k = Math.min(40, 0.8 / Math.max((x1 - x0) / largura, (y1 - y0) / altura));
  const t = d3.zoomIdentity.translate(largura / 2, altura / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  svg.transition().duration(dur).call(zoom.transform, t);
}

// ---------- seleção e painel ----------
function selecionar(key, doMapa) {
  if (doMapa && key === S.sel && nivel(key) !== 'mun') return;
  const ufAntes = ufDe(S.sel);
  S.sel = key;
  if (nivel(key) !== 'mun' || ufAntes !== ufDe(key)) enquadrar(key);
  desenhar();
  painel();
  salvarHash();
}

function rank(key, campo) {
  const niv = nivel(key);
  if (niv === 'br') return '';
  const v = val(key, campo);
  if (v == null || ind().f === 'cat') return '';
  const pos = (lista) => {
    const vs = lista.map(k => val(k, campo)).filter(x => x != null);
    return [vs.filter(x => x > v).length + 1, vs.length];
  };
  if (niv === 'mun') {
    const [p, n] = pos(PARES.mun());
    const uf = key.slice(0, 2);
    const [pu, nu] = pos(PARES.mun().filter(k => k.startsWith(uf)));
    return `${N0.format(p)}º de ${N0.format(n)} municípios · ${pu}º de ${nu} em ${G.locais[uf].sigla}`;
  }
  const [p, n] = pos(PARES[niv]());
  return `${p}º de ${n} ${niv === 'uf' ? 'estados' : 'regiões'}`;
}

function trilha(key) {
  const passos = ['BR'];
  if (nivel(key) !== 'br') {
    const uf = ufDe(key);
    passos.push('R' + (uf ? uf[0] : key[1]));
    if (uf) passos.push(uf);
  }
  return passos.filter(k => k !== key);
}

function linhaPainel(key, i) {
  let v = val(key, i.k), extra = '';
  if (v == null && nivel(key) === 'mun') {
    const vu = val(key.slice(0, 2), i.k);
    if (vu != null) { v = vu; extra = ' <small>(estado)</small>'; }
  }
  const tag = vivo.has(i.k) ? '<span class="vivo">ao vivo</span>' : '';
  return `<div><dt><button type="button" data-ind="${i.k}">${i.nome}</button>${tag}</dt><dd>${fmt(v, i.f)}${extra}</dd></div>`;
}

function painel() {
  const key = S.sel, i = ind(), el = document.getElementById('painel');
  const cor = i.cor || GRUPOS[i.g].cor;
  let v = val(key, i.k), notaDest = '';
  if (v == null && nivel(key) === 'mun' && val(key.slice(0, 2), i.k) != null) {
    v = val(key.slice(0, 2), i.k);
    notaDest = `Valor do estado: este indicador não existe por município.`;
  }
  const trilhaHtml = trilha(key).map(k => `<li><button type="button" data-sel="${k}">${G.locais[k].nome}</button></li>`).join('');
  let html = `<ol class="trilha">${trilhaHtml}</ol><h2>${nomeDe(key)}</h2>
    <div class="destaque" style="--g:${cor}"><div class="rot">${i.nome}</div><div class="val">${fmt(v, i.f)}</div>
    <div class="extra">${notaDest || rank(key, i.k)}</div></div>`;

  const ordem = Object.entries(GRUPOS).sort(([a], [b]) => (b === i.g) - (a === i.g)); // grupo do indicador escolhido primeiro
  for (const [g, info] of ordem) {
    const linhas = IND.filter(x => x.g === g && !['parda', 'branca', 'preta', 'indigena', 'amarela', 'venc', 'homens', 'mulheres'].includes(x.k) && !/^v\d/.test(x.k));
    html += `<section class="bloco"><h3><i style="--g:${info.cor}"></i>${info.nome}</h3><dl class="linhas">${linhas.map(x => linhaPainel(key, x)).join('')}</dl>`;
    if (g === 'pop') html += corRaca(key) + `<div class="piramide" id="piramide"></div>`;
    if (g === 'ele') html += votos(key);
    html += '</section>';
  }
  html += `<p class="nota">Toque no nome de um indicador para ver no mapa. <button type="button" class="linkfontes" style="background:none;border:0;padding:0;text-decoration:underline;color:inherit">Ver fontes</button></p>`;
  el.innerHTML = html;
  el.querySelectorAll('[data-ind]').forEach(b => b.onclick = () => escolherInd(b.dataset.ind));
  el.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => selecionar(b.dataset.sel));
  el.querySelector('.linkfontes').onclick = abrirFontes;
  piramide(key);
}

function corRaca(key) {
  const cats = [['parda', 'Parda', '#b07a4f'], ['branca', 'Branca', '#e3c9a8'], ['preta', 'Preta', '#5b3a29'], ['indigena', 'Indígena', '#2f8f7c'], ['amarela', 'Amarela', '#e0b23a']];
  if (val(key, 'branca') == null) return '';
  return `<div class="bloco"><h3>Cor ou raça</h3><div class="empilhado">${cats.map(([k, , c]) => `<span style="width:${val(key, k) || 0}%;background:${c}" title="${k}"></span>`).join('')}</div>
    <div class="chaves">${cats.map(([k, n, c]) => `<span><i style="background:${c}"></i>${n} ${fmt(val(key, k), 'pct')}</span>`).join('')}</div></div>`;
}

function votos(key) {
  const [a, b] = G.segundo_turno;
  if (val(key, 'v' + a) == null) return '';
  return `<div class="bloco"><h3>Presidente, 1º turno</h3>${[a, b].map(n => {
    const p = val(key, 'v' + n);
    return `<div class="voto"><div class="nome"><span>${G.candidatos[n].nome} (${G.candidatos[n].partido})</span><b>${fmt(p, 'pct')}</b></div><div class="trilho"><span style="width:${p}%;background:${VENC_COR[n]}"></span></div></div>`;
  }).join('')}<p class="nota">Percentual dos votos válidos. ${key === 'BR' ? 'Inclui votos no exterior.' : ''} O 2º turno será em 25 de outubro.</p></div>`;
}

const GRUPOS_IDADE = [93070, 93084, 93085, 93086, 93087, 93088, 93089, 93090, 93091, 93092, 93093, 93094, 93095, 93096, 93097, 93098, 49108, 49109, 60040, 60041, 6653];
const ROT_IDADE = ['0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85', '90', '95', '100+'];
const cachePir = new Map();
async function piramide(key) {
  const box = document.getElementById('piramide');
  if (!box) return;
  let dados = G.piramide[key];
  if (!dados && nivel(key) === 'mun') {
    if (!cachePir.has(key)) {
      cachePir.set(key, Promise.all([4, 5].map(s =>
        pegar(`${API}/9514/periodos/2022/variaveis/93?localidades=N6[${key}]&classificacao=2[${s}]|287[${GRUPOS_IDADE.join(',')}]|286[113635]`)
          .then(j => {
            const arr = new Array(21).fill(0);
            for (const res of j[0].resultados) {
              const g = GRUPOS_IDADE.indexOf(+Object.keys(res.classificacoes[1].categoria)[0]);
              arr[g] = +res.series[0].serie['2022'] || 0;
            }
            return arr;
          }))).catch(() => null));
    }
    box.innerHTML = '<p class="nota">Buscando a pirâmide etária no IBGE…</p>';
    dados = await cachePir.get(key);
    if (S.sel !== key) return;
    if (!dados) { box.innerHTML = '<p class="nota">Não foi possível buscar a pirâmide etária agora.</p>'; return; }
  }
  if (!dados) { box.innerHTML = ''; return; }
  // agrupa 90+ para a pirâmide ficar legível
  const junta = a => a.slice(0, 18).concat([a.slice(18).reduce((s, x) => s + x, 0)]);
  const H = junta(dados[0]), Mu = junta(dados[1]), rot = ROT_IDADE.slice(0, 18).concat(['90+']);
  const tot = H.reduce((s, x) => s + x, 0) + Mu.reduce((s, x) => s + x, 0);
  const max = d3.max(H.concat(Mu)) / tot;
  const W = 340, lin = 11, meio = W / 2, esc = (meio - 26) / max;
  const barras = rot.map((r, j) => {
    const y = (rot.length - 1 - j) * lin;
    const h = H[j] / tot * esc, m = Mu[j] / tot * esc;
    return `<rect x="${meio - 16 - h}" y="${y}" width="${h}" height="${lin - 2}" rx="2" fill="#2c5a9e"/>
      <rect x="${meio + 16}" y="${y}" width="${m}" height="${lin - 2}" rx="2" fill="#c06c84"/>
      <text x="${meio}" y="${y + 8}" text-anchor="middle">${r}</text>`;
  }).join('');
  box.innerHTML = `<h3 style="margin-top:16px;font-size:1.05rem">Pirâmide etária</h3>
    <svg viewBox="0 -14 ${W} ${rot.length * lin + 16}" role="img" aria-label="Pirâmide etária por sexo, Censo 2022">
    <text x="${meio - 20}" y="-4" text-anchor="end">Homens</text><text x="${meio + 20}" y="-4">Mulheres</text>${barras}</svg>
    <p class="nota">Censo 2022, por grupos de 5 anos de idade.${nivel(key) === 'mun' ? ' Buscado agora na API do IBGE.' : ''}</p>`;
}

// ---------- indicadores (barra de temas) ----------
let grupoAtivo = 'pop';
function temas() {
  const nav = document.getElementById('temas');
  grupoAtivo = ind().g;
  nav.innerHTML = `<div class="grupos">${Object.entries(GRUPOS).map(([g, x]) =>
    `<button type="button" data-g="${g}" style="--g:${x.cor}" aria-pressed="${g === grupoAtivo}">${x.nome}</button>`).join('')}</div>
    <div class="inds">${IND.filter(i => i.g === grupoAtivo).map(i =>
      `<button type="button" data-ind="${i.k}" aria-pressed="${i.k === S.ind}">${i.nome}</button>`).join('')}</div>`;
  nav.querySelectorAll('[data-g]').forEach(b => b.onclick = () => escolherInd(IND.find(i => i.g === b.dataset.g).k));
  nav.querySelectorAll('.inds [data-ind]').forEach(b => b.onclick = () => escolherInd(b.dataset.ind));
}
function escolherInd(k) {
  S.ind = k;
  const i = ind();
  document.getElementById('ind-nome').textContent = i.nome;
  document.getElementById('ind-desc').textContent = i.desc;
  temas();
  desenhar();
  painel();
  salvarHash();
}

// ---------- busca ----------
let indiceBusca = [];
function busca() {
  const inp = document.getElementById('busca'), ul = document.getElementById('busca-lista');
  indiceBusca = UFS().map(k => ({ k, n: G.locais[k].nome, d: 'Estado' }))
    .concat(['R1', 'R2', 'R3', 'R4', 'R5'].map(k => ({ k, n: G.locais[k].nome, d: 'Região' })))
    .concat([...MUN.entries()].map(([k, m]) => ({ k, n: m.nome, d: G.locais[k.slice(0, 2)].sigla })));
  indiceBusca.forEach(x => x.s = sem(x.n));
  let ativo = -1, res = [];
  const fechar = () => { ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); ativo = -1; };
  const ir = x => { selecionar(x.k); inp.value = ''; fechar(); inp.blur(); };
  inp.addEventListener('input', () => {
    const q = sem(inp.value.trim());
    if (q.length < 2) return fechar();
    res = indiceBusca.filter(x => x.s.includes(q))
      .sort((a, b) => (b.s.startsWith(q) - a.s.startsWith(q)) || (a.d.length > 2) - (b.d.length > 2) || (val(b.k, 'pop') || 0) - (val(a.k, 'pop') || 0))
      .slice(0, 8);
    ul.innerHTML = res.length ? res.map((x, j) => `<li role="option" id="op${j}" data-j="${j}"><span>${x.n}</span><small>${x.d}</small></li>`).join('')
      : '<li aria-disabled="true">Nenhum lugar com esse nome</li>';
    ul.hidden = false; inp.setAttribute('aria-expanded', 'true'); ativo = -1;
  });
  ul.addEventListener('mousedown', e => { const li = e.target.closest('[data-j]'); if (li) ir(res[+li.dataset.j]); });
  inp.addEventListener('keydown', e => {
    if (ul.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      ativo = (ativo + (e.key === 'ArrowDown' ? 1 : -1) + res.length) % res.length;
      ul.querySelectorAll('li').forEach((li, j) => li.setAttribute('aria-selected', j === ativo));
      inp.setAttribute('aria-activedescendant', 'op' + ativo);
    } else if (e.key === 'Enter' && res.length) { ir(res[Math.max(ativo, 0)]); }
    else if (e.key === 'Escape') fechar();
  });
  inp.addEventListener('blur', () => setTimeout(fechar, 150));
}

// ---------- fontes ----------
function abrirFontes() {
  const porFonte = {};
  IND.forEach(i => (porFonte[i.fonte] = porFonte[i.fonte] || []).push(i.nome));
  document.getElementById('lista-fontes').innerHTML = Object.entries(FONTES).map(([f, [n, u]]) =>
    `<h4><a href="${u}" target="_blank" rel="noopener">${n}</a></h4><p>${(porFonte[f] || []).join(', ')}.</p>`).join('')
    + `<h4>Observações</h4><ul>
      <li>O PIB per capita é calculado aqui: PIB de ${G.periodos.pib} dividido pela população do Censo 2022.</li>
      <li>O IDH por região não é publicado; o dos municípios é de 2010, último ano calculado para cidades.</li>
      <li>Expectativa de vida, mortalidade infantil e Gini não são divulgados por município.</li>
      <li>A taxa de homicídios das regiões soma os casos e a população dos estados de cada região.</li>
      <li>Resultados eleitorais casados com os municípios do IBGE pelo nome, conferidos um a um.</li></ul>`;
  document.getElementById('fontes').showModal();
}

// ---------- atualização ao vivo (IBGE) ----------
async function aoVivo() {
  const checar = async (tab, varId, campo, chavePer, mult = 1) => {
    try {
      const pers = await pegar(`${API}/${tab}/periodos`);
      const ult = pers[pers.length - 1].id;
      if (+ult <= +G.periodos[chavePer]) return false;
      const j = await pegar(`${API}/${tab}/periodos/${ult}/variaveis/${varId}?localidades=N1[all]|N2[all]|N3[all]|N6[all]`);
      for (const s of j[0].resultados[0].series) {
        const id = s.localidade.id, n = s.localidade.nivel.id;
        const key = n === 'N1' ? 'BR' : n === 'N2' ? 'R' + id : id;
        const l = linha(key), v = parseFloat(s.serie[ult]);
        if (l && !Number.isNaN(v)) l.v[COL[campo]] = v * mult;
      }
      G.periodos[chavePer] = ult;
      vivo.add(campo);
      return true;
    } catch (e) { return false; }
  };
  const [p, b] = await Promise.all([checar(6579, 9324, 'pop', 'pop'), checar(5938, 37, 'pib', 'pib', 1000)]);
  if (!p && !b) return;
  for (const key of [...Object.keys(G.locais), ...MUN.keys()]) {
    const l = linha(key);
    const pop = l.v[COL.pop], area = l.v[COL.area];
    if (pop && area) l.v[COL.dens] = Math.round(pop / area * 100) / 100;
    if (b && l.v[COL.pib] && l.v[COL.pop22]) l.v[COL.pib_pc] = Math.round(l.v[COL.pib] / l.v[COL.pop22]);
  }
  if (b) vivo.add('pib_pc');
  if (p) vivo.add('dens');
  montarIndicadores(G);
  escolherInd(S.ind);
}

// ---------- URL ----------
function salvarHash() {
  history.replaceState(null, '', `#${new URLSearchParams({ i: S.ind, l: S.sel, d: S.div })}`);
}
function lerHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (IND.some(i => i.k === p.get('i'))) S.ind = p.get('i');
  if (p.get('l') && linha(p.get('l'))) S.sel = p.get('l');
  if (['regiao', 'uf', 'mun'].includes(p.get('d'))) S.div = p.get('d');
}

// ---------- início ----------
async function iniciar() {
  const [geral, mun, topoUF] = await Promise.all([d3.json('data/geral.json'), d3.json('data/municipios.json'), d3.json('geo/uf.json')]);
  G = geral; M = mun;
  COL = Object.fromEntries(G.campos.map((c, j) => [c, j]));
  M.ids.forEach((id, j) => MUN.set(String(id), { nome: M.nomes[j], v: M.v[j] }));
  montarIndicadores(G);

  const objUF = topoUF.objects.BRUF;
  featUF = topojson.feature(topoUF, objUF).features;
  featReg = Object.keys(REGIOES).map(r => ({
    type: 'Feature', properties: { codarea: 'R' + r },
    geometry: topojson.merge(topoUF, objUF.geometries.filter(g => g.properties.codarea[0] === r)),
  }));

  lerHash();
  dimensionar();
  zoom = d3.zoom().scaleExtent([1, 60]).on('zoom', e => {
    raiz.attr('transform', e.transform);
    svg.classed('longe', e.transform.k < 2.5);
    const antes = S.k >= ZOOM_MUN;
    S.k = e.transform.k;
    if (antes !== (S.k >= ZOOM_MUN)) desenhar();
  }).on('end', () => { if (S.k >= ZOOM_MUN) desenhar(); });
  svg.call(zoom).on('dblclick.zoom', null).classed('longe', true);
  document.getElementById('zoom-mais').onclick = () => svg.transition().call(zoom.scaleBy, 1.8);
  document.getElementById('zoom-menos').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.8);
  document.getElementById('zoom-br').onclick = () => selecionar('BR');
  document.querySelectorAll('.divisao button').forEach(b => {
    b.setAttribute('aria-checked', b.dataset.div === S.div);
    b.onclick = () => {
      S.div = b.dataset.div;
      document.querySelectorAll('.divisao button').forEach(x => x.setAttribute('aria-checked', x === b));
      desenhar(); salvarHash();
    };
  });
  document.getElementById('abrir-fontes').onclick = abrirFontes;
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', desenhar);
  let tRes;
  window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => { dimensionar(); desenhar(); }, 150); });

  window.addEventListener('hashchange', () => {
    lerHash();
    document.querySelectorAll('.divisao button').forEach(x => x.setAttribute('aria-checked', x.dataset.div === S.div));
    enquadrar(S.sel);
    escolherInd(S.ind);
  });

  busca();
  escolherInd(S.ind);
  if (S.sel !== 'BR') enquadrar(S.sel, 0);
  aoVivo();
}

iniciar().catch(err => {
  console.error(err);
  document.getElementById('painel').innerHTML = '<h2>Não foi possível carregar os dados</h2><p>Verifique a conexão e recarregue a página.</p>';
});
})();
