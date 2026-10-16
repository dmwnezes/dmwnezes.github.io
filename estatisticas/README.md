# Retrato do Brasil

Mapa interativo com estatísticas oficiais do Brasil, das 5 regiões, dos 27 estados e dos 5.570 municípios.
Publicado em <https://dmwnezes.com/estatisticas>.

## Indicadores e fontes

| Tema | Indicadores | Fonte | Níveis |
|---|---|---|---|
| População | População estimada | IBGE, Estimativas da População (tabela 6579) | todos |
| População | População, homens, mulheres, idade mediana, envelhecimento, cor ou raça | IBGE, Censo 2022 (9514, 9515, 9605) | todos |
| Economia | PIB nominal | IBGE, PIB dos Municípios (5938) | todos |
| Economia | PIB per capita | calculado: PIB ÷ população do Censo 2022 | todos |
| Economia | Renda média por pessoa | IBGE, Censo 2022 (10295) | todos |
| Economia | Gini | IBGE, Censo 2022 (10301) | Brasil, regiões, estados |
| Desenvolvimento | IDH | PNUD/Ipea/FJP: Radar IDHM 2026 (ano-base 2024) e Atlas do Desenvolvimento Humano (municípios, 2010) via Ipeadata | Brasil, estados, municípios |
| Desenvolvimento | Alfabetização | IBGE, Censo 2022 (9543) | todos |
| Desenvolvimento | Expectativa de vida, mortalidade infantil | IBGE, Projeções da População rev. 2024 (ano 2024) | Brasil, regiões, estados |
| Saneamento | Água da rede geral, esgoto adequado | IBGE, Censo 2022 (6803, 6805) | todos |
| Segurança | Taxa de homicídios | Ipea/FBSP, Atlas da Violência via Ipeadata (estados 2024, municípios 2022) | todos |
| Eleições | Eleitores, comparecimento, votos para presidente no 1º turno | TSE, Resultados 2026 | todos |

## Como funciona

- `data/geral.json` (Brasil, regiões, estados) e `data/municipios.json` guardam a base.
- `geo/uf.json` e `geo/mun/<código da UF>.json` são as malhas do IBGE em TopoJSON; os municípios carregam por estado quando o mapa é aproximado.
- Ao abrir, o site consulta a API de agregados do IBGE: se houver estimativa de população ou PIB mais nova que a base, troca os valores na hora. A pirâmide etária dos municípios também é buscada ao vivo.

## Atualizar a base

```sh
python3 scripts/build_data.py PASTA_COM_ARQUIVOS
```

A pasta precisa ter: `idhm_uf_2024.json` (tabela 5 do Radar IDHM), `vida_2024.json` (Projeções, tab. 4),
`ipea_ADH_IDHM.json`, `ipea_AVIOL12_THOMIC.json`, `ipea_AVIOL12_HOMIC.json` (API OData do Ipeadata) e `tse/`
com `votacao_candidato_munzona_2026` e `detalhe_votacao_munzona_2026` descompactados. Os dados do IBGE vêm direto da API.
