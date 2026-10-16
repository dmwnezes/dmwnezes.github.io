"""Gera a base embutida do site (data/*.json) a partir das fontes oficiais.

Uso: python3 scripts/build_data.py RAW_DIR
RAW_DIR deve conter os arquivos baixados à parte (ver README):
  idhm_uf_2024.json, vida_2024.json, ipea_ADH_IDHM.json, ipea_AVIOL12_THOMIC.json,
  ipea_AVIOL12_HOMIC.json, tse/ (votacao_candidato_munzona_2026, detalhe_votacao_munzona_2026)
Os dados do IBGE são buscados direto na API de agregados.
"""
import csv, difflib, gzip, json, os, sys, unicodedata, urllib.request, collections

RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'data')
API = 'https://servicodados.ibge.gov.br/api/v3/agregados'
LEVELS = 'N1[all]|N2[all]|N3[all]|N6[all]'

REG = {'1': 'Norte', '2': 'Nordeste', '3': 'Sudeste', '4': 'Sul', '5': 'Centro-Oeste'}
UF = {'11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
      '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
      '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
      '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'}
SIGLA2COD = {v: k for k, v in UF.items()}


def get(url):
    for _ in range(4):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                b = r.read()
                return json.loads(gzip.decompress(b) if b[:2] == b'\x1f\x8b' else b)
        except Exception as e:  # rede instável: tenta de novo
            err = e
    raise err


def key(loc):
    """Código interno: BR, R1..R5, código UF (2 dígitos) ou município (7)."""
    n, i = loc['nivel']['id'], loc['id']
    return 'BR' if n == 'N1' else ('R' + i if n == 'N2' else i)


def agregado(tab, per, var, classif='', levels=LEVELS):
    """Devolve {categoria: {local: valor}} (categoria '' quando não há classificação)."""
    url = f'{API}/{tab}/periodos/{per}/variaveis/{var}?localidades={levels}'
    if classif:
        url += '&classificacao=' + classif
    out = collections.defaultdict(dict)
    for v in get(url):
        for res in v['resultados']:
            cats = [list(c['categoria'])[0] for c in res['classificacoes']]
            cat = cats[0] if cats else ''
            for s in res['series']:
                val = list(s['serie'].values())[0]
                try:
                    out[cat][key(s['localidade'])] = float(val)
                except (TypeError, ValueError):  # '-', '...', 'X' = sem dado
                    pass
    return out


D = collections.defaultdict(dict)  # D[local][indicador] = valor
NOMES = {}

print('população estimada')
per_est = get(f'{API}/6579/periodos')[-1]['id']
for k, v in agregado(6579, per_est, 9324)[''].items():
    D[k]['pop'] = v

print('censo: sexo')
sx = agregado(9514, 2022, 93, '2[6794,4,5]|287[100362]|286[113635]')
for k in sx['6794']:
    D[k]['pop22'] = sx['6794'][k]
    D[k]['homens'] = sx['4'].get(k)
    D[k]['mulheres'] = sx['5'].get(k)

print('censo: idade mediana / envelhecimento')
for var, nome in ((10613, 'idade_med'), (10612, 'envelh')):
    for k, v in agregado(9515, 2022, var)[''].items():
        D[k][nome] = v

print('censo: alfabetização')
alf =agregado(9543, 2022, 2513, '2[6794]|86[95251]|287[100362]')
for k, v in list(alf.values())[0].items():
    D[k]['alfab'] = v

print('censo: cor ou raça')
cor = agregado(9605, 2022, 1000093, '86[2776,2777,2778,2779,2780]')
for cat, nome in (('2776', 'branca'), ('2777', 'preta'), ('2778', 'amarela'), ('2779', 'parda'), ('2780', 'indigena')):
    for k in cor['2776']:  # '-' na tabela = zero
        D[k][nome] = cor[cat].get(k, 0.0)

print('censo: saneamento')
for k, v in agregado(6805, 2022, 1000381, '11558[46290]')['46290'].items():
    D[k]['esgoto'] = v
for k, v in agregado(6803, 2022, 1000381, '1821[72144]')['72144'].items():
    D[k]['agua'] = v

print('censo: renda e Gini')
r = agregado(10295, 2022, 13431, '2[6794]|86[95251]|58[95253]')
for k, v in list(r.values())[0].items():
    D[k]['renda'] = v
for k, v in agregado(10301, 2022, 13418, levels='N1[all]|N2[all]|N3[all]')[''].items():
    D[k]['gini'] = v

print('PIB dos municípios')
per_pib = get(f'{API}/5938/periodos')[-1]['id']
for k, v in agregado(5938, per_pib, 37)[''].items():
    D[k]['pib'] = v * 1000  # mil R$ -> R$

print('pirâmide etária (Brasil, regiões, UFs)')
GRUPOS = [93070, 93084, 93085, 93086, 93087, 93088, 93089, 93090, 93091, 93092, 93093,
          93094, 93095, 93096, 93097, 93098, 49108, 49109, 60040, 60041, 6653]
pir = {}
for sexo in (4, 5):
    url = (f'{API}/9514/periodos/2022/variaveis/93?localidades=N1[all]|N2[all]|N3[all]'
           f'&classificacao=2[{sexo}]|287[{",".join(map(str, GRUPOS))}]|286[113635]')
    for v in get(url):
        for res in v['resultados']:
            g = GRUPOS.index(int(list(res['classificacoes'][1]['categoria'])[0]))
            for s in res['series']:
                k = key(s['localidade'])
                pir.setdefault(k, [[0] * 21, [0] * 21])[0 if sexo == 4 else 1][g] = int(s['serie']['2022'])

print('área territorial')
for m in get('https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR/metadados?intrarregiao=municipio'):
    D[m['id']]['area'] = float(m['area']['dimensao'])

print('nomes')
for m in get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios'):
    NOMES[str(m['id'])] = m['nome']

# --- fontes externas ao IBGE (arquivos em RAW) ---
idh_uf = json.load(open(os.path.join(RAW, 'idhm_uf_2024.json')))
uf_nome = {str(u['id']): u['nome'] for u in get('https://servicodados.ibge.gov.br/api/v1/localidades/estados')}
for c, n in uf_nome.items():
    D[c]['idh'] = idh_uf[n]
D['BR']['idh'] = 0.805  # Radar IDHM 2026 (ano-base 2024)

for v in json.load(open(os.path.join(RAW, 'ipea_ADH_IDHM.json')))['value']:
    if v['NIVNOME'] == 'Municípios' and v['VALDATA'].startswith('2010') and v['VALVALOR'] is not None:
        D[v['TERCODIGO']]['idh'] = v['VALVALOR']

vida = json.load(open(os.path.join(RAW, 'vida_2024.json')))
for sig, v in vida.items():
    k = 'BR' if v['cod'] == 0 else ('R' + str(v['cod']) if v['cod'] < 10 else str(v['cod']))
    D[k]['vida'] = v['e0']
    D[k]['tmi'] = v['tmi']

# homicídios (Atlas da Violência via Ipeadata): UF/BR 2024, municípios 2022
taxa = json.load(open(os.path.join(RAW, 'ipea_AVIOL12_THOMIC.json')))['value']
qtd = json.load(open(os.path.join(RAW, 'ipea_AVIOL12_HOMIC.json')))['value']
ano_uf = max(v['VALDATA'][:4] for v in taxa if v['NIVNOME'] == 'Estados' and v['VALVALOR'] is not None)
ano_mun = max(v['VALDATA'][:4] for v in taxa if v['NIVNOME'] == 'Municípios' and v['VALVALOR'] is not None)
q_uf = {v['TERCODIGO']: v['VALVALOR'] for v in qtd if v['NIVNOME'] == 'Estados' and v['VALDATA'].startswith(ano_uf)}
popr = collections.Counter()
homr = collections.Counter()
for v in taxa:
    if v['VALVALOR'] is None:
        continue
    if v['NIVNOME'] == 'Estados' and v['VALDATA'].startswith(ano_uf):
        D[v['TERCODIGO']]['homic'] = v['VALVALOR']
        h = q_uf.get(v['TERCODIGO'])
        if h and v['VALVALOR']:
            r = 'R' + v['TERCODIGO'][0]
            homr[r] += h
            popr[r] += h / v['VALVALOR'] * 1e5  # população implícita na taxa
    elif v['NIVNOME'] == 'Brasil' and v['VALDATA'].startswith(ano_uf):
        D['BR']['homic'] = v['VALVALOR']
    elif v['NIVNOME'] == 'Municípios' and v['VALDATA'].startswith(ano_mun):
        D[v['TERCODIGO']]['homic'] = v['VALVALOR']
for r in homr:
    D[r]['homic'] = round(homr[r] / popr[r] * 1e5, 1)

# --- TSE 2026: eleitorado, comparecimento e 1º turno para presidente ---
def norm(s):
    s = unicodedata.normalize('NFKD', s.upper()).encode('ascii', 'ignore').decode()
    return ''.join(ch for ch in s if ch.isalnum())

ibge_por_nome = {}
for c, n in NOMES.items():
    ibge_por_nome[(UF[c[:2]], norm(n))] = c

TSE_IBGE = {('RN', 'BOASAUDE'): 'JANUARIOCICCO', ('GO', 'BOMJESUS'): 'BOMJESUSDEGOIAS',
            ('RR', 'SAOLUIZ'): 'SAOLUIZDOANAUA'}  # nomes antigos ou abreviados no TSE


def casa_nome(uf, nome):
    """Casa grafias do TSE com o IBGE (D'Oeste/do Oeste, Mello/Melo, Thomé/Tomé...)."""
    n = TSE_IBGE.get((uf, norm(nome)), norm(nome))
    if (uf, n) in ibge_por_nome:
        return ibge_por_nome[(uf, n)]
    cands = [nn for (u, nn) in ibge_por_nome if u == uf]
    m = difflib.get_close_matches(n, cands, n=1, cutoff=0.82)
    if m:
        print('  TSE~IBGE:', uf, nome, '->', NOMES[ibge_por_nome[(uf, m[0])]])
        return ibge_por_nome[(uf, m[0])]
    return None


TSE = os.path.join(RAW, 'tse')
tse2ibge, sem_par = {}, set()
eleit = collections.defaultdict(lambda: [0, 0])  # aptos, comparecimento
with open(os.path.join(TSE, 'detalhe_votacao_munzona_2026', 'detalhe_votacao_munzona_2026_BR.csv'), encoding='latin1') as f:
    for row in csv.DictReader(f, delimiter=';'):
        if row['NR_TURNO'] != '1' or row['DS_CARGO'] != 'Presidente':
            continue
        uf = row['SG_UF']
        if uf == 'ZZ':
            k = 'ZZ'
        else:
            k = tse2ibge.get(int(row['CD_MUNICIPIO']))
            if k is None:
                k = casa_nome(uf, row['NM_MUNICIPIO'])
                if k is None:
                    sem_par.add((uf, row['NM_MUNICIPIO'], row['CD_MUNICIPIO']))
                    continue
                tse2ibge[int(row['CD_MUNICIPIO'])] = k
        eleit[k][0] += int(row['QT_APTOS'])
        eleit[k][1] += int(row['QT_COMPARECIMENTO'])

votos = collections.defaultdict(collections.Counter)
cand_info = {}
with open(os.path.join(TSE, 'votacao_candidato_munzona_2026', 'votacao_candidato_munzona_2026_BR.csv'), encoding='latin1') as f:
    for row in csv.DictReader(f, delimiter=';'):
        if row['NR_TURNO'] != '1':
            continue
        k = 'ZZ' if row['SG_UF'] == 'ZZ' else tse2ibge.get(int(row['CD_MUNICIPIO']))
        if k is None:
            continue
        n = row['NR_CANDIDATO']
        cand_info[n] = (row['NM_URNA_CANDIDATO'], row['SG_PARTIDO'], row['DS_SIT_TOT_TURNO'])
        votos[k][n] += int(row['QT_VOTOS_NOMINAIS_VALIDOS'])

agg_v = collections.defaultdict(collections.Counter)
for k, c in votos.items():
    agg_v[k] = c
for k, c in list(votos.items()):
    if k == 'ZZ':
        continue
    agg_v[k[:2]] += c
    agg_v['R' + k[0]] += c
agg_v['BR'] = sum(votos.values(), collections.Counter())
for k, (a, comp) in list(eleit.items()):
    if k == 'ZZ':
        continue
    for alvo in (k, k[:2], 'R' + k[0], 'BR'):
        D[alvo]['_apt'] = D[alvo].get('_apt', 0) + a
        D[alvo]['_comp'] = D[alvo].get('_comp', 0) + comp
D['BR']['_apt'] += eleit['ZZ'][0]
D['BR']['_comp'] += eleit['ZZ'][1]

segundo = sorted([n for n, i in cand_info.items() if i[2] == '2º TURNO'],
                 key=lambda n: -agg_v['BR'][n])
for k, c in agg_v.items():
    if k == 'ZZ':
        continue
    tot = sum(c.values())
    if not tot:
        continue
    for n in segundo:
        D[k]['v' + n] = round(c[n] / tot * 100, 2)
    D[k]['venc'] = int(c.most_common(1)[0][0])
for k, d in D.items():
    if '_apt' in d:
        d['eleitores'] = d.pop('_apt')
        d['comparec'] = round(d.pop('_comp') / d['eleitores'] * 100, 2)

# --- agrega regiões/BR que faltam (área) e derivados ---
for c in [k for k in D if len(k) == 7]:
    for alvo in (c[:2], 'R' + c[0], 'BR'):
        D[alvo]['_area'] = D[alvo].get('_area', 0) + D[c].get('area', 0)
for k, d in D.items():
    if '_area' in d:
        d['area'] = round(d.pop('_area'), 1)
    if d.get('pop') and d.get('area'):
        d['dens'] = round(d['pop'] / d['area'], 2)
    if d.get('pib') and d.get('pop22'):
        d['pib_pc'] = round(d['pib'] / d['pop22'])
    if d.get('mulheres') and d.get('pop22'):
        d['pct_mulheres'] = round(d['mulheres'] / d['pop22'] * 100, 2)

# --- grava ---
os.makedirs(OUT, exist_ok=True)
CAMPOS = ['pop', 'pop22', 'homens', 'mulheres', 'pct_mulheres', 'area', 'dens', 'pib', 'pib_pc',
          'idh', 'renda', 'gini', 'alfab', 'idade_med', 'envelh', 'branca', 'parda', 'preta',
          'amarela', 'indigena', 'agua', 'esgoto', 'vida', 'tmi', 'homic', 'eleitores',
          'comparec'] + ['v' + n for n in segundo] + ['venc']

def linha(d):
    return [None if d.get(c) is None else (round(d[c], 3) if isinstance(d[c], float) else d[c]) for c in CAMPOS]

geral = {'campos': CAMPOS, 'locais': {}, 'piramide': pir,
         'candidatos': {n: {'nome': i[0].title(), 'partido': i[1], 'situacao': i[2]} for n, i in cand_info.items()},
         'segundo_turno': segundo,
         'periodos': {'pop': per_est, 'pib': per_pib, 'homic_uf': ano_uf, 'homic_mun': ano_mun}}
geral['locais']['BR'] = {'nome': 'Brasil', 'v': linha(D['BR'])}
for r, n in REG.items():
    geral['locais']['R' + r] = {'nome': n, 'v': linha(D['R' + r])}
for c, n in uf_nome.items():
    geral['locais'][c] = {'nome': n, 'sigla': UF[c], 'v': linha(D[c])}
json.dump(geral, open(os.path.join(OUT, 'geral.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

mun = {'campos': CAMPOS, 'ids': [], 'nomes': [], 'v': []}
for c in sorted(NOMES):
    mun['ids'].append(int(c))
    mun['nomes'].append(NOMES[c])
    mun['v'].append(linha(D[c]))
json.dump(mun, open(os.path.join(OUT, 'municipios.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

print('municípios sem par no TSE:', len(sem_par), sorted(sem_par)[:40])
faltam = {c: sum(1 for k in NOMES if D[k].get(c) is None) for c in CAMPOS}
print('municípios sem dado por campo:', faltam)
