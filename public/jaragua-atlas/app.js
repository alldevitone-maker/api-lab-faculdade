/* global maplibregl */
import { CITY_2026, LOCAL_2026 } from './data/elections.js';

const state = {
  mode: '2026',
  metric: 'margin',
  labels: true,
  selectedKey: null,
  geo: null,
  municipality: null,
  meta: null,
  history2022: null
};

const aliases = new Map([
  ['BRACO RIBEIRAO CAVALO', 'BRACO DO RIBEIRAO CAVALO'],
  ['BRACO DO RIBEIRAO CAVALO', 'BRACO DO RIBEIRAO CAVALO'],
  ['NOVA BRASILIA', 'NOVA BRASILIA'],
  ['SAO LUIS', 'SAO LUIS']
]);

const by2026 = new Map(LOCAL_2026.map(row => [electoralKey(row.name), row]));
let by2022Round1 = new Map();
let by2022Round2 = new Map();

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
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
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
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
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
      const e22 = by2022Round1.get(key);
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
        props.e22_abstention = e22.abstentionPct;
        props.e22_valid = e22.valid;
      }

      if (e26 && e22) {
        props.delta_blue = e26.blueShare - e22.blueShare;
        props.delta_red = e26.redShare - e22.redShare;
        props.delta_margin = (e26.blueShare - e26.redShare) - (e22.blueShare - e22.redShare);
        props.delta_abstention = e26.abstentionPct - e22.abstentionPct;
      }

      return { ...feature, properties: props };
    })
  };
}

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {},
    layers: [{
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#071018' }
    }]
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
      ['interpolate', ['linear'], ['get', 'e26_blue'], 55, '#182b42', 70, '#285ed1', 85, '#8eb1ff'],
      noData];
  }
  if (mode === '2026' && metric === 'red') {
    return ['case', ['has', 'e26_red'],
      ['interpolate', ['linear'], ['get', 'e26_red'], 8, '#3a1a24', 20, '#be324a', 32, '#ff93a2'],
      noData];
  }
  if (mode === '2026' && metric === 'margin') {
    return ['case', ['has', 'e26_margin'],
      ['interpolate', ['linear'], ['get', 'e26_margin'], -20, '#ef445d', 0, '#695970', 35, '#493d85', 55, '#2f6fff', 80, '#93b4ff'],
      noData];
  }
  if (mode === '2026' && metric === 'abstention') {
    return ['case', ['has', 'e26_abstention'],
      ['interpolate', ['linear'], ['get', 'e26_abstention'], 9, '#1f3c3c', 15, '#a9782a', 22, '#ffd36c'],
      noData];
  }

  if (mode === '2022' && metric === 'blue') {
    return ['case', ['has', 'e22_blue'],
      ['interpolate', ['linear'], ['get', 'e22_blue'], 55, '#182b42', 70, '#285ed1', 85, '#8eb1ff'],
      noData];
  }
  if (mode === '2022' && metric === 'red') {
    return ['case', ['has', 'e22_red'],
      ['interpolate', ['linear'], ['get', 'e22_red'], 8, '#3a1a24', 20, '#be324a', 32, '#ff93a2'],
      noData];
  }
  if (mode === '2022' && metric === 'margin') {
    return ['case', ['has', 'e22_margin'],
      ['interpolate', ['linear'], ['get', 'e22_margin'], -20, '#ef445d', 0, '#695970', 35, '#493d85', 55, '#2f6fff', 80, '#93b4ff'],
      noData];
  }
  if (mode === '2022' && metric === 'abstention') {
    return ['case', ['has', 'e22_abstention'],
      ['interpolate', ['linear'], ['get', 'e22_abstention'], 9, '#1f3c3c', 15, '#a9782a', 22, '#ffd36c'],
      noData];
  }

  if (mode === 'consolidated' && metric === 'blue') {
    return ['case', ['has', 'delta_blue'],
      ['interpolate', ['linear'], ['get', 'delta_blue'], -15, '#ef445d', -4, '#7b536c', 0, '#5f6872', 4, '#4164b3', 15, '#86aaff'],
      noData];
  }
  if (mode === 'consolidated' && metric === 'red') {
    return ['case', ['has', 'delta_red'],
      ['interpolate', ['linear'], ['get', 'delta_red'], -15, '#2f6fff', -4, '#69516a', 0, '#5f6872', 4, '#c6334b', 15, '#ff8798'],
      noData];
  }
  if (mode === 'consolidated' && metric === 'margin') {
    return ['case', ['has', 'delta_margin'],
      ['interpolate', ['linear'], ['get', 'delta_margin'], -25, '#ef445d', 0, '#5f6872', 25, '#2f6fff'],
      noData];
  }
  if (mode === 'consolidated' && metric === 'abstention') {
    return ['case', ['has', 'delta_abstention'],
      ['interpolate', ['linear'], ['get', 'delta_abstention'], -8, '#38d39f', 0, '#5f6872', 8, '#f6b73c'],
      noData];
  }

  return noData;
}

function setMapPaint() {
  if (!map.getLayer('neighborhood-fill')) return;
  map.setPaintProperty('neighborhood-fill', 'fill-color', expressionFor(state.mode, state.metric));
  map.setPaintProperty('neighborhood-fill', 'fill-opacity', 0.9);
}

function city2022Round1() {
  return state.history2022?.round1?.city ?? null;
}

function updateKpis() {
  const v = id => document.querySelector(id);
  const historical = city2022Round1();

  if (state.mode === 'consolidated') {
    if (!historical) return;
    v('#kpi-valid').textContent = `${compact(historical.valid)} → ${compact(CITY_2026.valid)}`;
    v('#kpi-turnout').textContent = `${fmtPct(historical.turnoutPct)} → ${fmtPct(CITY_2026.turnoutPct)}`;
    v('#kpi-blue').textContent = fmtPp(CITY_2026.candidates[0].share - historical.blueShare);
    v('#kpi-red').textContent = fmtPp(CITY_2026.candidates[1].share - historical.redShare);
    return;
  }

  if (state.mode === '2022') {
    if (!historical) return;
    v('#kpi-valid').textContent = fmtInt(historical.valid);
    v('#kpi-turnout').textContent = fmtPct(historical.turnoutPct);
    v('#kpi-blue').textContent = fmtPct(historical.blueShare);
    v('#kpi-red').textContent = fmtPct(historical.redShare);
    return;
  }

  v('#kpi-valid').textContent = fmtInt(CITY_2026.valid);
  v('#kpi-turnout').textContent = fmtPct(CITY_2026.turnoutPct);
  v('#kpi-blue').textContent = fmtPct(CITY_2026.candidates[0].share);
  v('#kpi-red').textContent = fmtPct(CITY_2026.candidates[1].share);
}

function legendSpec() {
  if (state.mode === '2026' && state.metric === 'blue') return ['Campo 22 · Flávio Bolsonaro · 2026', '#182b42', '#285ed1', '#8eb1ff', 'menor share', 'maior share'];
  if (state.mode === '2026' && state.metric === 'red') return ['Lula 13 · 2026', '#3a1a24', '#be324a', '#ff93a2', 'menor share', 'maior share'];
  if (state.mode === '2026' && state.metric === 'abstention') return ['Abstenção · 2026', '#1f3c3c', '#a9782a', '#ffd36c', 'menor', 'maior'];
  if (state.mode === '2022' && state.metric === 'blue') return ['Jair Bolsonaro 22 · 1º turno 2022', '#182b42', '#285ed1', '#8eb1ff', 'menor share', 'maior share'];
  if (state.mode === '2022' && state.metric === 'red') return ['Lula 13 · 1º turno 2022', '#3a1a24', '#be324a', '#ff93a2', 'menor share', 'maior share'];
  if (state.mode === '2022' && state.metric === 'abstention') return ['Abstenção · 1º turno 2022', '#1f3c3c', '#a9782a', '#ffd36c', 'menor', 'maior'];
  if (state.mode === 'consolidated' && state.metric === 'blue') return ['Δ Campo 22 · 1º turno 2022→2026', '#ef445d', '#5f6872', '#86aaff', 'share caiu', 'share subiu'];
  if (state.mode === 'consolidated' && state.metric === 'red') return ['Δ Lula 13 · 1º turno 2022→2026', '#2f6fff', '#5f6872', '#ff8798', 'share caiu', 'share subiu'];
  if (state.mode === 'consolidated' && state.metric === 'abstention') return ['Δ abstenção · 1º turno 2022→2026', '#38d39f', '#5f6872', '#f6b73c', 'caiu', 'subiu'];
  if (state.mode === 'consolidated') return ['Δ margem 22 − 13 · 1º turno 2022→2026', '#ef445d', '#5f6872', '#2f6fff', 'aproximou de Lula', 'ampliou para 22'];
  return ['Disputa 22 × 13 · margem em pontos percentuais', '#ef445d', '#695970', '#2f6fff', 'vantagem Lula', 'vantagem Campo 22'];
}

function updateLegend() {
  const [title, a, b, c, left, right] = legendSpec();
  els.legend.innerHTML = `
    <div class="legend-row"><strong>${title}</strong></div>
    <div class="legend-scale" style="background:linear-gradient(90deg,${a},${b},${c})"></div>
    <div class="legend-labels"><span>${left}</span><span>${right}</span></div>
    <div class="legend-row"><span class="legend-chip" style="background:#192631"></span><span>Sem correspondência territorial segura</span></div>
  `;
}

function modeLabel() {
  if (state.mode === '2026') return '2026 · 1º turno';
  if (state.mode === '2022') return '2022 · 1º turno';
  return '2022 → 2026 · 1º turno';
}

function metricLabel() {
  return ({
    blue: 'Campo 22',
    red: 'Lula 13',
    margin: 'Disputa 22×13',
    abstention: 'Abstenção'
  })[state.metric];
}

function refreshUi() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === state.mode);
  });
  document.querySelectorAll('.metric-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.metric === state.metric);
  });
  els.metricStatus.textContent = modeLabel();
  els.hudMode.textContent = `${modeLabel()} · ${metricLabel()}`;
  updateKpis();
  updateLegend();
  setMapPaint();
  if (state.selectedKey) renderInspector(state.selectedKey);
}

function metricValue(row) {
  if (!row) return null;
  if (state.metric === 'blue') return row.blueShare;
  if (state.metric === 'red') return row.redShare;
  if (state.metric === 'margin') return row.blueShare - row.redShare;
  return row.abstentionPct;
}

function rankFor(row, collection) {
  if (!row) return null;
  const sorted = collection
    .map(item => ({ item, value: metricValue(item) }))
    .filter(x => x.value != null)
    .sort((a, b) => b.value - a.value);
  return sorted.findIndex(x => electoralKey(x.item.name) === electoralKey(row.name)) + 1;
}

function barHtml(label, value, colorClass) {
  return `
    <div>
      <div class="mini-bar-head"><span>${label}</span><strong>${fmtPct(value)}</strong></div>
      <div class="mini-track"><div class="mini-fill ${colorClass}" style="width:${Math.max(0, Math.min(Number(value) || 0, 100))}%"></div></div>
    </div>
  `;
}

function allCandidates2026Html(row) {
  const entries = CITY_2026.candidates
    .map(candidate => ({
      ...candidate,
      localVotes: Number(row.candidateVotes?.[String(candidate.number)] ?? 0),
      localShare: row.valid ? Number(row.candidateVotes?.[String(candidate.number)] ?? 0) / row.valid * 100 : 0
    }))
    .sort((a, b) => b.localVotes - a.localVotes);

  return `
    <details class="candidate-details">
      <summary>Todos os 12 candidatos · 2026</summary>
      <div class="candidate-list">
        ${entries.map((candidate, index) => `
          <div class="candidate-row">
            <span class="candidate-rank">${index + 1}</span>
            <span class="candidate-name">${candidate.name}<small>${candidate.number}</small></span>
            <strong>${fmtInt(candidate.localVotes)}</strong>
            <span class="candidate-share">${fmtPct(candidate.localShare)}</span>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

function details2026(row) {
  if (!row) return '<div class="warning-note">Sem correspondência nominal segura com a localidade eleitoral de 2026.</div>';
  return `
    <div class="mini-bars">
      ${barHtml('Campo 22 · Flávio Bolsonaro', row.blueShare, 'blue')}
      ${barHtml('Lula 13', row.redShare, 'red')}
    </div>
    <div class="detail-list">
      <div class="detail-row"><span>Válidos 2026</span><strong>${fmtInt(row.valid)}</strong></div>
      <div class="detail-row"><span>Campo 22 · votos</span><strong>${fmtInt(row.blueVotes)}</strong></div>
      <div class="detail-row"><span>Lula · votos</span><strong>${fmtInt(row.redVotes)}</strong></div>
      <div class="detail-row"><span>Outros candidatos</span><strong>${fmtInt(row.otherVotes)}</strong></div>
      <div class="detail-row"><span>Abstenção</span><strong>${fmtPct(row.abstentionPct)}</strong></div>
      <div class="detail-row"><span>Brancos / nulos</span><strong>${fmtInt(row.blank)} / ${fmtInt(row.nullVotes)}</strong></div>
    </div>
    ${allCandidates2026Html(row)}
  `;
}

function details2022(round1, round2) {
  if (!round1) {
    return '<div class="warning-note">Sem correspondência nominal segura com o bairro do local de votação TSE em 2022.</div>';
  }
  return `
    <div class="mini-bars">
      ${barHtml('Jair Bolsonaro 22 · 1º turno', round1.blueShare, 'blue')}
      ${barHtml('Lula 13 · 1º turno', round1.redShare, 'red')}
    </div>
    <div class="detail-list">
      <div class="detail-row"><span>Válidos · 1º turno</span><strong>${fmtInt(round1.valid)}</strong></div>
      <div class="detail-row"><span>Bolsonaro · votos</span><strong>${fmtInt(round1.blueVotes)}</strong></div>
      <div class="detail-row"><span>Lula · votos</span><strong>${fmtInt(round1.redVotes)}</strong></div>
      <div class="detail-row"><span>Outros candidatos</span><strong>${fmtInt(round1.otherVotes)}</strong></div>
      <div class="detail-row"><span>Abstenção</span><strong>${fmtPct(round1.abstentionPct)}</strong></div>
      <div class="detail-row"><span>Seções / locais</span><strong>${fmtInt(round1.sections)} / ${fmtInt(round1.locations)}</strong></div>
      ${round2 ? `
        <div class="detail-row"><span>Final 2022 · Bolsonaro</span><strong>${fmtPct(round2.blueShare)}</strong></div>
        <div class="detail-row"><span>Final 2022 · Lula</span><strong>${fmtPct(round2.redShare)}</strong></div>
      ` : ''}
    </div>
    <div class="warning-note">Bairro = bairro do local de votação cadastrado no TSE. Não representa necessariamente o bairro de residência do eleitor.</div>
  `;
}

function comparisonHtml(e22, e26) {
  if (!e22 || !e26) {
    return '<div class="warning-note">O comparativo só aparece onde 2022 e 2026 possuem correspondência territorial nominal compatível.</div>';
  }
  return `
    <div class="detail-list">
      <div class="detail-row"><span>Campo 22 · 2022</span><strong>${fmtPct(e22.blueShare)}</strong></div>
      <div class="detail-row"><span>Campo 22 · 2026</span><strong>${fmtPct(e26.blueShare)} · ${fmtPp(e26.blueShare - e22.blueShare)}</strong></div>
      <div class="detail-row"><span>Lula · 2022</span><strong>${fmtPct(e22.redShare)}</strong></div>
      <div class="detail-row"><span>Lula · 2026</span><strong>${fmtPct(e26.redShare)} · ${fmtPp(e26.redShare - e22.redShare)}</strong></div>
      <div class="detail-row"><span>Margem 22−13 · 2022</span><strong>${fmtPp(e22.blueShare - e22.redShare)}</strong></div>
      <div class="detail-row"><span>Margem 22−13 · 2026</span><strong>${fmtPp(e26.blueShare - e26.redShare)}</strong></div>
      <div class="detail-row"><span>Δ da margem</span><strong>${fmtPp((e26.blueShare - e26.redShare) - (e22.blueShare - e22.redShare))}</strong></div>
      <div class="detail-row"><span>Δ abstenção</span><strong>${fmtPp(e26.abstentionPct - e22.abstentionPct)}</strong></div>
    </div>
    <div class="warning-note">O consolidado compara o 1º turno de 2022 com o 1º turno de 2026. “Campo 22” descreve o número eleitoral em cada eleição; os candidatos são identificados separadamente.</div>
  `;
}

function renderInspector(key) {
  const feature = state.geo?.features.find(f => f.properties.key === key);
  if (!feature) return;

  const e26 = by2026.get(key);
  const e22 = by2022Round1.get(key);
  const e22Final = by2022Round2.get(key);
  const name = feature.properties.name;

  let heroLabel = metricLabel();
  let heroValue = 'Sem dado';
  let rank = null;
  let body = '';

  if (state.mode === '2026') {
    if (e26) {
      const value = metricValue(e26);
      heroValue = state.metric === 'margin' ? fmtPp(value) : fmtPct(value);
      rank = rankFor(e26, LOCAL_2026);
    }
    body = details2026(e26);
  } else if (state.mode === '2022') {
    if (e22) {
      const value = metricValue(e22);
      heroValue = state.metric === 'margin' ? fmtPp(value) : fmtPct(value);
      rank = rankFor(e22, state.history2022.round1.localities);
    }
    body = details2022(e22, e22Final);
  } else {
    if (e22 && e26) {
      const value = state.metric === 'blue'
        ? e26.blueShare - e22.blueShare
        : state.metric === 'red'
          ? e26.redShare - e22.redShare
          : state.metric === 'abstention'
            ? e26.abstentionPct - e22.abstentionPct
            : (e26.blueShare - e26.redShare) - (e22.blueShare - e22.redShare);
      heroLabel = `Δ ${metricLabel()}`;
      heroValue = fmtPp(value);
    }
    body = comparisonHtml(e22, e26);
  }

  els.inspectorEmpty.hidden = true;
  els.inspectorContent.hidden = false;
  els.inspectorContent.innerHTML = `
    <div class="inspector-header">
      <span class="eyebrow">ÁREA OFICIAL IBGE</span>
      <h2>${name}</h2>
      <div class="inspector-sub">Camada: ${modeLabel()} · vínculo nominal com bairro/localidade do TSE</div>
    </div>
    <div class="metric-hero">
      <div><span>${heroLabel}</span><strong>${heroValue}</strong></div>
      ${rank ? `<span class="rank-badge">#${rank}</span>` : ''}
    </div>
    ${body}
  `;
}

function selectFeature(feature, { fit = false } = {}) {
  state.selectedKey = feature.properties.key;
  map.setFilter('selected-line', ['==', ['get', 'key'], state.selectedKey]);
  renderInspector(state.selectedKey);
  if (fit) {
    map.fitBounds(featureBounds(feature), {
      padding: 90,
      duration: 650,
      maxZoom: 13.5
    });
  }
}

function fitMunicipality() {
  if (!state.municipality?.features?.[0]) return;
  map.fitBounds(featureBounds(state.municipality.features[0]), {
    padding: window.innerWidth < 860
      ? { top: 80, bottom: 330, left: 40, right: 40 }
      : { top: 70, bottom: 70, left: 70, right: 390 },
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

    const matches = names
      .filter(item => normalize(item.name).includes(q))
      .slice(0, 8);

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
  const [neighborhoodResponse, municipalityResponse, metaResponse, historicalResponse] = await Promise.all([
    fetch('./data/bairros.geojson', { cache: 'no-cache' }),
    fetch('./data/municipio.geojson', { cache: 'no-cache' }),
    fetch('./data/geodata-meta.json', { cache: 'no-cache' }),
    fetch('./data/election-2022-local.json', { cache: 'no-cache' })
  ]);

  if (!neighborhoodResponse.ok || !municipalityResponse.ok || !historicalResponse.ok) {
    throw new Error('Uma ou mais camadas oficiais não foram geradas no deploy.');
  }

  const rawNeighborhoods = await neighborhoodResponse.json();
  state.municipality = await municipalityResponse.json();
  state.meta = metaResponse.ok ? await metaResponse.json() : null;
  state.history2022 = await historicalResponse.json();

  by2022Round1 = new Map(
    state.history2022.round1.localities.map(row => [electoralKey(row.name), row])
  );
  by2022Round2 = new Map(
    state.history2022.round2.localities.map(row => [electoralKey(row.name), row])
  );

  state.geo = annotateNeighborhoods(rawNeighborhoods);

  const matched2026 = state.geo.features.filter(f => f.properties.e26_blue != null).length;
  const matched2022 = state.geo.features.filter(f => f.properties.e22_blue != null).length;
  const sectionCoverage = state.history2022.round1.quality.mappingCoveragePct;

  els.coverage.textContent =
    `${state.geo.features.length} áreas oficiais IBGE · ${matched2026} vinculadas a 2026 · ${matched2022} vinculadas ao 1º turno de 2022 · ${fmtPct(sectionCoverage)} das seções 2022 com bairro TSE.`;
  els.hudSource.textContent =
    `IBGE · TSE · 2022 reconciliado ${fmtPct(sectionCoverage)}`;

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
      'fill-opacity': 0.9
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

  map.on('mouseenter', 'neighborhood-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'neighborhood-fill', () => {
    map.getCanvas().style.cursor = '';
  });
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
    refreshUi();
  });
});

document.querySelectorAll('.metric-btn').forEach(button => {
  button.addEventListener('click', () => {
    state.metric = button.dataset.metric;
    refreshUi();
  });
});

document.querySelector('#reset-map').addEventListener('click', fitMunicipality);
document.querySelector('#open-methodology').addEventListener('click', () => els.dialog.showModal());

document.querySelector('#toggle-labels').addEventListener('click', event => {
  state.labels = !state.labels;
  event.currentTarget.setAttribute('aria-pressed', String(state.labels));
  if (map.getLayer('neighborhood-labels')) {
    map.setLayoutProperty(
      'neighborhood-labels',
      'visibility',
      state.labels ? 'visible' : 'none'
    );
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
        <strong>Não foi possível carregar o atlas oficial.</strong>
        <span>${error.message}</span>
      </div>
    `;
  });
});
