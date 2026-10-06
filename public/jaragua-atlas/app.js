import { CITY_2026, CITY_2022, LOCAL_2026, LOCAL_2022_PROXY } from './data/elections.js';

const state = {
  mode: '2026',
  metric: 'blue',
  labels: true,
  selectedKey: null,
  geo: null,
  municipality: null,
  meta: null
};

const by2026 = new Map(LOCAL_2026.map(row => [normalize(row.name), row]));
const by2022 = new Map(LOCAL_2022_PROXY.map(row => [normalize(row.name), row]));

const aliases = new Map([
  ['BRACO RIBEIRAO CAVALO', 'BRACO DO RIBEIRAO CAVALO'],
  ['BRACO DO RIBEIRAO CAVALO', 'BRACO DO RIBEIRAO CAVALO'],
  ['NOVA BRASILIA', 'NOVA BRASILIA'],
  ['SAO LUIS', 'SAO LUIS']
]);

const els = {
  loading: document.querySelector('#loading-state'),
  coverage: document.querySelector('#coverage-copy'),
  legend: document.querySelector('#legend'),
  hudMode: document.querySelector('#hud-mode'),
  hudSource: document.querySelector('#hud-source'),
  metricStatus: document.querySelector('#metric-status'),
  inspectorEmpty: document.querySelector('#inspector-empty'),
  inspectorContent: document.querySelector('#inspector-content'),
  search: document.querySelector('#neighborhood-search'),
  searchResults: document.querySelector('#search-results'),
  controls: document.querySelector('.control-rail'),
  dialog: document.querySelector('#methodology-dialog')
};

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toUpperCase();
}

function electoralKey(name) {
  const normalized = normalize(name);
  return aliases.get(normalized) || normalized;
}

function fmtInt(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function fmtPct(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits).replace('.', ',')}%`;
}

function fmtPp(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2).replace('.', ',')} p.p.`;
}

function compact(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function flattenCoordinates(node, acc = []) {
  if (!Array.isArray(node)) return acc;
  if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
    acc.push([node[0], node[1]]);
    return acc;
  }
  node.forEach(child => flattenCoordinates(child, acc));
  return acc;
}

function featureBounds(feature) {
  const coords = flattenCoordinates(feature.geometry.coordinates);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return [[minX, minY], [maxX, maxY]];
}

function annotateNeighborhoods(fc) {
  return {
    ...fc,
    features: fc.features.map((feature, index) => {
      const name = feature.properties?.name || `Bairro ${index + 1}`;
      const key = electoralKey(name);
      const e26 = by2026.get(key);
      const e22 = by2022.get(key);
      const props = { ...feature.properties, name, key };

      if (e26) {
        props.e26_blue = e26.blueShare;
        props.e26_red = e26.redShare;
        props.e26_margin = e26.blueShare - e26.redShare;
        props.e26_abstention = e26.abstentionPct;
        props.e26_valid = e26.valid;
      }
      if (e22) {
        props.e22_blue = e22.blueShare;
        props.e22_red = e22.redShare;
        props.e22_margin = e22.blueShare - e22.redShare;
      }
      if (e26 && e22) {
        props.delta_blue = e26.blueShare - e22.blueShare;
        props.delta_red = e26.redShare - e22.redShare;
        props.delta_balance = (e26.blueShare - e26.redShare) - (e22.blueShare - e22.redShare);
      }

      return { ...feature, properties: props };
    })
  };
}

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#071018' } }]
  },
  center: [-49.07, -26.49],
  zoom: 10.1,
  minZoom: 8.5,
  maxZoom: 16,
  attributionControl: false
});

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
map.addControl(new maplibregl.AttributionControl({
  compact: true,
  customAttribution: 'Geografia: IBGE · Eleições: TSE'
}), 'bottom-right');

function expressionFor(mode, metric) {
  const noData = '#192631';

  if (mode === '2026' && metric === 'blue') {
    return ['case', ['has', 'e26_blue'],
      ['interpolate', ['linear'], ['get', 'e26_blue'], 60, '#173252', 70, '#2557c9', 85, '#80a9ff'],
      noData];
  }
  if (mode === '2026' && metric === 'red') {
    return ['case', ['has', 'e26_red'],
      ['interpolate', ['linear'], ['get', 'e26_red'], 8, '#3a1a24', 20, '#b72f47', 30, '#ff8798'],
      noData];
  }
  if (mode === '2026' && metric === 'margin') {
    return ['case', ['has', 'e26_margin'],
      ['interpolate', ['linear'], ['get', 'e26_margin'], -20, '#ef445d', 0, '#6f7882', 60, '#2f6fff', 80, '#8fb0ff'],
      noData];
  }
  if (mode === '2026' && metric === 'abstention') {
    return ['case', ['has', 'e26_abstention'],
      ['interpolate', ['linear'], ['get', 'e26_abstention'], 9, '#21343a', 15, '#b27c27', 22, '#ffd069'],
      noData];
  }

  if (mode === '2022' && metric === 'blue') {
    return ['case', ['has', 'e22_blue'],
      ['interpolate', ['linear'], ['get', 'e22_blue'], 70, '#173252', 77, '#2f6fff', 83, '#8fb0ff'],
      noData];
  }
  if (mode === '2022' && metric === 'red') {
    return ['case', ['has', 'e22_red'],
      ['interpolate', ['linear'], ['get', 'e22_red'], 15, '#4c1f2a', 23, '#ef445d', 30, '#ff9baa'],
      noData];
  }
  if (mode === '2022' && metric === 'margin') {
    return ['case', ['has', 'e22_margin'],
      ['interpolate', ['linear'], ['get', 'e22_margin'], 35, '#40506a', 55, '#2f6fff', 70, '#8fb0ff'],
      noData];
  }
  if (mode === '2022' && metric === 'abstention') return noData;

  if (mode === 'consolidated' && metric === 'blue') {
    return ['case', ['has', 'delta_blue'],
      ['interpolate', ['linear'], ['get', 'delta_blue'], -12, '#ef445d', -4, '#6b4a67', 0, '#5d6670', 4, '#315fc4', 12, '#86aaff'],
      noData];
  }
  if (mode === 'consolidated' && metric === 'red') {
    return ['case', ['has', 'delta_red'],
      ['interpolate', ['linear'], ['get', 'delta_red'], -12, '#2f6fff', -4, '#69516a', 0, '#5d6670', 4, '#c6334b', 12, '#ff8798'],
      noData];
  }
  if (mode === 'consolidated' && metric === 'margin') {
    return ['case', ['has', 'delta_balance'],
      ['interpolate', ['linear'], ['get', 'delta_balance'], -20, '#ef445d', 0, '#5d6670', 20, '#2f6fff'],
      noData];
  }
  if (mode === 'consolidated' && metric === 'abstention') {
    return ['case', ['has', 'e26_abstention'],
      ['interpolate', ['linear'], ['get', 'e26_abstention'], 9, '#21343a', 15, '#b27c27', 22, '#ffd069'],
      noData];
  }

  return noData;
}

function setMapPaint() {
  if (!map.getLayer('neighborhood-fill')) return;
  map.setPaintProperty('neighborhood-fill', 'fill-color', expressionFor(state.mode, state.metric));
  map.setPaintProperty('neighborhood-fill', 'fill-opacity', state.mode === '2022' ? 0.9 : 0.88);
}

function updateKpis() {
  const v = id => document.querySelector(id);
  const city = state.mode === '2022' ? CITY_2022 : CITY_2026;

  if (state.mode === 'consolidated') {
    v('#kpi-valid').textContent = `${compact(CITY_2022.valid)} → ${compact(CITY_2026.valid)}`;
    v('#kpi-turnout').textContent = `${fmtPct(CITY_2022.turnoutPct)} → ${fmtPct(CITY_2026.turnoutPct)}`;
    v('#kpi-blue').textContent = fmtPp(CITY_2026.candidates[0].share - CITY_2022.candidates[0].share);
    v('#kpi-red').textContent = fmtPp(CITY_2026.candidates[1].share - CITY_2022.candidates[1].share);
    return;
  }

  v('#kpi-valid').textContent = fmtInt(city.valid);
  v('#kpi-turnout').textContent = fmtPct(city.turnoutPct ?? (city.turnout / city.electorate * 100));
  v('#kpi-blue').textContent = fmtPct(city.candidates[0].share);
  v('#kpi-red').textContent = fmtPct(city.candidates[1].share);
}

function legendSpec() {
  if (state.mode === '2026' && state.metric === 'blue') return ['Campo 22 em 2026', '#173252', '#2557c9', '#80a9ff', 'menor share', 'maior share'];
  if (state.mode === '2026' && state.metric === 'red') return ['Lula 13 em 2026', '#3a1a24', '#b72f47', '#ff8798', 'menor share', 'maior share'];
  if (state.mode === '2026' && state.metric === 'abstention') return ['Abstenção 2026', '#21343a', '#b27c27', '#ffd069', 'menor', 'maior'];
  if (state.mode === '2022' && state.metric === 'blue') return ['Jair Bolsonaro · 2º turno 2022 · proxy local', '#173252', '#2f6fff', '#8fb0ff', 'menor', 'maior'];
  if (state.mode === '2022' && state.metric === 'red') return ['Lula · 2º turno 2022 · proxy local', '#4c1f2a', '#ef445d', '#ff9baa', 'menor', 'maior'];
  if (state.mode === 'consolidated' && state.metric === 'blue') return ['Δ share Campo 22 · 2022→2026', '#ef445d', '#5d6670', '#2f6fff', 'caiu', 'subiu'];
  if (state.mode === 'consolidated' && state.metric === 'red') return ['Δ share Lula · 2022→2026', '#2f6fff', '#5d6670', '#ef445d', 'caiu', 'subiu'];
  if (state.mode === 'consolidated' && state.metric === 'margin') return ['Mudança do saldo 22 − 13', '#ef445d', '#5d6670', '#2f6fff', 'saldo aproximou de Lula', 'saldo ampliou para 22'];
  return ['Margem eleitoral', '#ef445d', '#5d6670', '#2f6fff', 'mais vermelho', 'mais azul'];
}

function updateLegend() {
  const [title, a, b, c, left, right] = legendSpec();
  els.legend.innerHTML = `
    <div class="legend-row"><strong>${title}</strong></div>
    <div class="legend-scale" style="background:linear-gradient(90deg,${a},${b},${c})"></div>
    <div class="legend-labels"><span>${left}</span><span>${right}</span></div>
    <div class="legend-row"><span class="legend-chip" style="background:#192631"></span><span>Sem cobertura compatível para esta camada</span></div>
  `;
}

function modeLabel() {
  if (state.mode === '2026') return '2026 · 1º turno';
  if (state.mode === '2022') return '2022 · 2º turno';
  return '2022 → 2026 · comparação';
}

function metricLabel() {
  return ({ blue: 'Campo 22', red: 'Lula 13', margin: 'Margem', abstention: 'Abstenção' })[state.metric];
}

function refreshUi() {
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('is-active', btn.dataset.mode === state.mode));
  document.querySelectorAll('.metric-btn').forEach(btn => btn.classList.toggle('is-active', btn.dataset.metric === state.metric));
  els.metricStatus.textContent = modeLabel();
  els.hudMode.textContent = `${modeLabel()} · ${metricLabel()}`;
  updateKpis();
  updateLegend();
  setMapPaint();
  if (state.selectedKey) renderInspector(state.selectedKey);
}

function metricValueFor2026(row) {
  if (!row) return null;
  if (state.metric === 'blue') return row.blueShare;
  if (state.metric === 'red') return row.redShare;
  if (state.metric === 'margin') return row.blueShare - row.redShare;
  return row.abstentionPct;
}

function rankFor2026(row) {
  if (!row || state.mode !== '2026') return null;
  const sorted = LOCAL_2026
    .map(item => ({ item, value: metricValueFor2026(item) }))
    .filter(x => x.value != null)
    .sort((a, b) => b.value - a.value);
  return sorted.findIndex(x => x.item.name === row.name) + 1;
}

function renderInspector(key) {
  const feature = state.geo?.features.find(f => f.properties.key === key);
  if (!feature) return;

  const e26 = by2026.get(key);
  const e22 = by2022.get(key);
  const name = feature.properties.name;
  const rank = rankFor2026(e26);

  let heroLabel = metricLabel();
  let heroValue = 'Sem dado';

  if (state.mode === '2026' && e26) {
    const value = metricValueFor2026(e26);
    heroValue = state.metric === 'margin' ? fmtPp(value) : fmtPct(value);
  } else if (state.mode === '2022' && e22) {
    const value = state.metric === 'blue' ? e22.blueShare : state.metric === 'red' ? e22.redShare : e22.blueShare - e22.redShare;
    heroValue = state.metric === 'margin' ? fmtPp(value) : fmtPct(value);
  } else if (state.mode === 'consolidated' && e26 && e22) {
    const value = state.metric === 'blue'
      ? e26.blueShare - e22.blueShare
      : state.metric === 'red'
        ? e26.redShare - e22.redShare
        : (e26.blueShare - e26.redShare) - (e22.blueShare - e22.redShare);
    heroLabel = `Δ ${metricLabel()}`;
    heroValue = fmtPp(value);
  }

  els.inspectorEmpty.hidden = true;
  els.inspectorContent.hidden = false;
  els.inspectorContent.innerHTML = `
    <div class="inspector-header">
      <span class="eyebrow">BAIRRO / ÁREA OFICIAL</span>
      <h2>${name}</h2>
      <div class="inspector-sub">Vínculo eleitoral: ${e26 ? e26.name : 'sem correspondência nominal 2026'}</div>
    </div>
    <div class="metric-hero">
      <div><span>${heroLabel}</span><strong>${heroValue}</strong></div>
      ${rank ? `<span class="rank-badge">#${rank} de ${LOCAL_2026.length}</span>` : ''}
    </div>
    ${e26 ? `
      <div class="mini-bars">
        <div>
          <div class="mini-bar-head"><span>Campo 22 · Flávio Bolsonaro</span><strong>${fmtPct(e26.blueShare)}</strong></div>
          <div class="mini-track"><div class="mini-fill blue" style="width:${Math.min(e26.blueShare,100)}%"></div></div>
        </div>
        <div>
          <div class="mini-bar-head"><span>Lula 13</span><strong>${fmtPct(e26.redShare)}</strong></div>
          <div class="mini-track"><div class="mini-fill red" style="width:${Math.min(e26.redShare,100)}%"></div></div>
        </div>
      </div>
      <div class="detail-list">
        <div class="detail-row"><span>Válidos 2026</span><strong>${fmtInt(e26.valid)}</strong></div>
        <div class="detail-row"><span>Campo 22 · votos</span><strong>${fmtInt(e26.blueVotes)}</strong></div>
        <div class="detail-row"><span>Lula · votos</span><strong>${fmtInt(e26.redVotes)}</strong></div>
        <div class="detail-row"><span>Outros candidatos</span><strong>${fmtInt(e26.otherVotes)}</strong></div>
        <div class="detail-row"><span>Abstenção</span><strong>${fmtPct(e26.abstentionPct)}</strong></div>
        <div class="detail-row"><span>Brancos / nulos</span><strong>${fmtInt(e26.blank)} / ${fmtInt(e26.nullVotes)}</strong></div>
      </div>
    ` : '<div class="warning-note">Esta área oficial ainda não possui correspondência nominal segura com a localidade eleitoral de 2026.</div>'}
    ${e22 ? `
      <div class="detail-list" style="margin-top:14px">
        <div class="detail-row"><span>2022 · Jair Bolsonaro</span><strong>${fmtPct(e22.blueShare)}</strong></div>
        <div class="detail-row"><span>2022 · Lula</span><strong>${fmtPct(e22.redShare)}</strong></div>
        <div class="detail-row"><span>Amostra local publicada</span><strong>${e22.observations} local(is)</strong></div>
      </div>
      <div class="warning-note">2022 local é proxy dos maiores locais de votação publicados, não agregado completo do bairro. O total municipal de 2022 é oficial.</div>
    ` : '<div class="warning-note">Sem proxy local de 2022 para esta área. O mapa não inventa valor onde a cobertura não existe.</div>'}
  `;
}

function selectFeature(feature, { fit = false } = {}) {
  state.selectedKey = feature.properties.key;
  map.setFilter('selected-line', ['==', ['get', 'key'], state.selectedKey]);
  renderInspector(state.selectedKey);
  if (fit) map.fitBounds(featureBounds(feature), { padding: 90, duration: 650, maxZoom: 13.5 });
}

function fitMunicipality() {
  if (!state.municipality?.features?.[0]) return;
  map.fitBounds(featureBounds(state.municipality.features[0]), {
    padding: window.innerWidth < 860 ? { top: 80, bottom: 330, left: 40, right: 40 } : { top: 70, bottom: 70, left: 70, right: 390 },
    duration: 650
  });
}

function setupSearch() {
  const names = state.geo.features
    .map(feature => ({ name: feature.properties.name, feature }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  els.search.addEventListener('input', () => {
    const q = normalize(els.search.value);
    if (!q) {
      els.searchResults.hidden = true;
      els.searchResults.innerHTML = '';
      return;
    }
    const matches = names.filter(item => normalize(item.name).includes(q)).slice(0, 8);
    els.searchResults.innerHTML = matches.map((item, index) =>
      `<button class="search-result" data-index="${index}">${item.name}</button>`
    ).join('');
    els.searchResults.hidden = matches.length === 0;
    els.searchResults.querySelectorAll('.search-result').forEach((button, index) => {
      button.addEventListener('click', () => {
        const item = matches[index];
        els.search.value = item.name;
        els.searchResults.hidden = true;
        selectFeature(item.feature, { fit: true });
      });
    });
  });
}

async function loadData() {
  const [neighborhoodResponse, municipalityResponse, metaResponse] = await Promise.all([
    fetch('./data/bairros.geojson', { cache: 'no-cache' }),
    fetch('./data/municipio.geojson', { cache: 'no-cache' }),
    fetch('./data/geodata-meta.json', { cache: 'no-cache' })
  ]);

  if (!neighborhoodResponse.ok || !municipalityResponse.ok) {
    throw new Error('Camadas vetoriais não foram geradas no deploy.');
  }

  const rawNeighborhoods = await neighborhoodResponse.json();
  state.municipality = await municipalityResponse.json();
  state.meta = metaResponse.ok ? await metaResponse.json() : null;
  state.geo = annotateNeighborhoods(rawNeighborhoods);

  const matched2026 = state.geo.features.filter(f => f.properties.e26_blue != null).length;
  const matched2022 = state.geo.features.filter(f => f.properties.e22_blue != null).length;
  els.coverage.textContent = `${state.geo.features.length} áreas oficiais IBGE · ${matched2026} vinculadas a 2026 · ${matched2022} com proxy local de 2022.`;
  els.hudSource.textContent = `IBGE · TSE · ${state.meta?.neighborhoodFeatures ?? state.geo.features.length} áreas`;

  map.addSource('municipality', { type: 'geojson', data: state.municipality });
  map.addSource('neighborhoods', { type: 'geojson', data: state.geo });

  map.addLayer({
    id: 'municipality-mask',
    type: 'fill',
    source: 'municipality',
    paint: { 'fill-color': '#09141e', 'fill-opacity': 0.22 }
  });
  map.addLayer({
    id: 'neighborhood-fill',
    type: 'fill',
    source: 'neighborhoods',
    paint: {
      'fill-color': expressionFor(state.mode, state.metric),
      'fill-opacity': 0.88
    }
  });
  map.addLayer({
    id: 'neighborhood-lines',
    type: 'line',
    source: 'neighborhoods',
    paint: {
      'line-color': 'rgba(224,235,245,.48)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 13, 1.4, 16, 2.2]
    }
  });
  map.addLayer({
    id: 'municipality-line',
    type: 'line',
    source: 'municipality',
    paint: {
      'line-color': '#d8e3ef',
      'line-opacity': 0.72,
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.4, 13, 2.4]
    }
  });
  map.addLayer({
    id: 'selected-line',
    type: 'line',
    source: 'neighborhoods',
    filter: ['==', ['get', 'key'], '__none__'],
    paint: {
      'line-color': '#ffffff',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 14, 4],
      'line-opacity': 0.95
    }
  });
  map.addLayer({
    id: 'neighborhood-labels',
    type: 'symbol',
    source: 'neighborhoods',
    minzoom: 10.2,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 13],
      'text-font': ['Open Sans Regular'],
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.05,
      'text-max-width': 10
    },
    paint: {
      'text-color': '#f2f6fa',
      'text-halo-color': 'rgba(5,12,18,.88)',
      'text-halo-width': 1.2
    }
  });

  map.on('mouseenter', 'neighborhood-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'neighborhood-fill', () => { map.getCanvas().style.cursor = ''; });
  map.on('click', 'neighborhood-fill', event => {
    const feature = event.features?.[0];
    if (feature) selectFeature(feature);
  });

  setupSearch();
  fitMunicipality();
  refreshUi();
  els.loading.classList.add('is-hidden');
}

document.querySelectorAll('.mode-btn').forEach(button => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    if (state.mode === '2022' && state.metric === 'abstention') state.metric = 'blue';
    refreshUi();
  });
});

document.querySelectorAll('.metric-btn').forEach(button => {
  button.addEventListener('click', () => {
    state.metric = button.dataset.metric;
    if (state.mode === '2022' && state.metric === 'abstention') {
      state.metric = 'blue';
    }
    refreshUi();
  });
});

document.querySelector('#reset-map').addEventListener('click', fitMunicipality);
document.querySelector('#open-methodology').addEventListener('click', () => els.dialog.showModal());
document.querySelector('#toggle-labels').addEventListener('click', event => {
  state.labels = !state.labels;
  event.currentTarget.setAttribute('aria-pressed', String(state.labels));
  if (map.getLayer('neighborhood-labels')) {
    map.setLayoutProperty('neighborhood-labels', 'visibility', state.labels ? 'visible' : 'none');
  }
});
document.querySelector('#toggle-theme').addEventListener('click', () => {
  const root = document.documentElement;
  const light = root.dataset.theme !== 'light';
  root.dataset.theme = light ? 'light' : 'dark';
  if (map.getLayer('background')) {
    map.setPaintProperty('background', 'background-color', light ? '#e9eff5' : '#071018');
  }
});
document.querySelector('#toggle-controls')?.addEventListener('click', () => {
  els.controls.classList.toggle('mobile-open');
});

map.on('load', () => {
  loadData().catch(error => {
    console.error(error);
    els.loading.innerHTML = `
      <div>
        <strong>Não foi possível carregar a geografia oficial.</strong>
        <span>${error.message}</span>
      </div>
    `;
  });
});
