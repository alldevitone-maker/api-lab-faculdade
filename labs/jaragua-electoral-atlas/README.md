# Jaraguá Electoral Atlas

Interactive, single-map electoral intelligence experience for Jaraguá do Sul (SC), embedded in the API Lab GitHub Pages deployment.

## Product intent

The atlas is deliberately **not** a dashboard made of multiple maps. It keeps one tactical WebGL map as the primary analytical object and changes layers, metrics and time context around that map.

Current public route after deployment:

`/api-lab-faculdade/jaragua-atlas/`

## Architecture

```text
public/jaragua-atlas/
├── index.html              # semantic shell and controls
├── styles.css              # responsive tactical UI
├── app.js                  # MapLibre rendering + interaction + analytics
└── data/
    └── elections.js        # audited electoral facts and explicit proxies

scripts/
└── build-jaragua-geodata.py # authoritative IBGE shapefile → compact GeoJSON

.github/workflows/deploy.yml  # CI validates and generates geodata before Vite build
```

### Runtime

- MapLibre GL JS 6.12.0
- WebGL vector rendering
- no raster screenshots or manually traced neighborhood images
- official IBGE geometry is generated during CI and shipped as local GeoJSON
- the map itself is intentionally minimal: tactical background, municipal outline, neighborhood polygons and labels

### Build pipeline

The GitHub Actions deployment:

1. runs the existing Node lint, tests and version checks
2. provisions Python 3.12
3. installs pinned `pyshp==2.3.1`
4. downloads the IBGE Censo 2022 neighborhood mesh for Santa Catarina
5. downloads the IBGE 2024 municipal mesh for Santa Catarina
6. filters both by municipality code `4208906`
7. validates geographic coordinate ranges and minimum neighborhood count
8. writes compact `bairros.geojson`, `municipio.geojson` and provenance metadata
9. performs the normal Vite build, browser tests and GitHub Pages deployment

A failed or suspicious geodata extraction fails the deployment instead of publishing a misleading map.

## Electoral layers

### 2026

The 2026 layer comes from the reconciled Jaraguá do Sul report:

- 384 / 384 ballot bulletins processed
- 108,628 valid presidential votes
- 37 TSE locality/name groups
- all 12 presidential candidates reconciled at municipality level

The web map currently exposes:

- Campo 22 share
- Lula 13 share
- margin
- abstention
- valid votes
- absolute votes for the two leading candidates
- blank and null votes
- other-candidate total
- ranking inside the 2026 TSE-locality dataset

### 2022

Municipality totals use the official final presidential round.

Local coloring is **not presented as complete neighborhood aggregation**. The first published version uses a transparent proxy derived from the top local voting places made available by NanoIris using TSE data. The UI marks this coverage explicitly.

This limitation is intentional. Unknown values stay unknown instead of being imputed.

### Consolidated

The comparison layer only computes neighborhood change where both periods have local coverage.

It can show:

- Δ Campo 22 share
- Δ Lula share
- change in the `22 − 13` balance

The product does not claim that Jair Bolsonaro in 2022 and Flávio Bolsonaro in 2026 are the same candidate. The comparison describes the electoral number/field and the observed share, with the candidate name preserved per election.

## Geographic crosswalk

TSE localities describe the voting-place registration field, not the voter's home address. IBGE neighborhoods are territorial polygons.

The atlas therefore uses a normalized, auditable name crosswalk. Unmatched rural/locality names are not force-fitted into an official neighborhood polygon.

Examples that require care include:

- Rio Molha vs Barra do Rio Molha
- Rio da Luz vs Rio da Luz II
- rural localities not represented as urban neighborhood polygons

A future data release should add coordinates for voting places and a spatial crosswalk rather than relying only on normalized text.

## Interaction model

Desktop:

- left analytical control rail
- one central map
- floating search
- right neighborhood inspector

Mobile:

- full-screen map
- touch zoom/pan
- filter rail opened from the toolbar
- bottom-sheet inspector

## Quality principles

- no invented neighborhood values
- official geometry is preferred over hand-drawn polygons
- source provenance ships with the deployment
- all uncertain local historical data is marked as proxy
- election stages are labeled explicitly
- map color is a descriptive encoding, not a recommendation or forecast
- causal claims about demographics and voting are intentionally excluded

## Next enterprise milestones

1. replace the 2022 proxy with a complete section-level TSE ingestion
2. geocode every voting place and build a spatial crosswalk
3. add 2026 minor-candidate local distributions
4. integrate Censo 2022 sector variables only at compatible spatial resolution
5. add exportable comparison tables and permalinks for selected neighborhoods
6. add visual regression tests for desktop and mobile
7. move the atlas to a dedicated repository/domain when the prototype stabilizes
