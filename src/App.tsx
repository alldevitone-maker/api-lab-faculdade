import { useRef, useState } from 'react';
import { ApiLabCore } from './features/http-lab/services/core';
import { DEFAULT_REQUEST, PRESETS } from './features/http-lab/examples/presets';
import { WIKI_FIELDS } from './features/wiki/content/fields';
import type { LabRequest, LabResponse, OutputFormat } from './features/http-lab/models/request';
import { APP_DISPLAY_VERSION } from './shared/constants/appVersion';

type Mode = 'beginner' | 'pro';
type Theme = 'light' | 'dark';
const STORAGE_KEYS = { mode: 'api-lab-mode', theme: 'api-lab-theme' } as const;
const ERROR_CODES = [400, 401, 404, 500] as const;
const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'http', label: 'HTTP' }, { value: 'curl', label: 'cURL' }, { value: 'fetch', label: 'fetch()' }
];

export default function App() {
  const [request, setRequest] = useState<LabRequest>(DEFAULT_REQUEST);
  const [mode, setMode] = useState<Mode>(() => localStorage.getItem(STORAGE_KEYS.mode) === 'pro' ? 'pro' : 'beginner');
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [response, setResponse] = useState<LabResponse | null>(null);
  const [audit, setAudit] = useState<ReturnType<typeof ApiLabCore.audit> | null>(null);
  const [message, setMessage] = useState('');
  // A mesma base permanece na memória da aba para demonstrar o ciclo CRUD.
  const database = useRef(ApiLabCore.newDatabase());
  const generated = ApiLabCore.generate(request);

  function update<K extends keyof LabRequest>(key: K, value: LabRequest[K]) {
    setRequest(previous => ({ ...previous, [key]: value }));
    setResponse(null);
  }
  function selectPreset(changes: Partial<LabRequest>) {
    setRequest(previous => ({ ...previous, ...changes }));
    setResponse(null);
    setMessage('Exemplo preenchido. Clique em Simular resposta.');
  }
  function changeTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next); localStorage.setItem(STORAGE_KEYS.theme, next);
  }
  function changeMode() {
    const next = mode === 'beginner' ? 'pro' : 'beginner';
    setMode(next); localStorage.setItem(STORAGE_KEYS.mode, next);
  }
  async function copyOutput() {
    if (!generated.ok) return;
    try { await navigator.clipboard.writeText(generated.output); setMessage('Código copiado.'); }
    catch { setMessage('O navegador não permitiu copiar. Selecione o texto manualmente.'); }
  }
  function simulate(forcedStatus?: number) {
    if (!generated.ok) { setResponse(null); setMessage('Corrija os campos destacados para simular.'); return; }
    // Erros forçados ensinam códigos HTTP; requisições comuns alteram a base local.
    setResponse(forcedStatus ? ApiLabCore.simulate(request.method, forcedStatus) : ApiLabCore.simulateRequest(request, database.current));
    setMessage('Resposta simulada localmente. Nenhuma chamada foi enviada à URL.');
  }

  return <div className={`app theme-${theme} mode-${mode}`}>
    <a className="skip-link" href="#laboratorio">Ir ao laboratório</a>
    <header className="topbar">
      <button className="menu-button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      <div className="brand"><strong>API Lab</strong><span>Faculdade · {APP_DISPLAY_VERSION}</span></div>
      <div className="top-actions"><button onClick={changeMode}>Modo {mode === 'beginner' ? 'iniciante' : 'profissional'}</button><button onClick={changeTheme} aria-label="Alternar tema">{theme === 'light' ? '☾ Escuro' : '☀ Claro'}</button></div>
    </header>
    <div className="shell">
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Seções" onClick={() => setMenuOpen(false)}>
        <a href="#inicio">Início</a><a href="#exemplos">Exemplos</a><a href="#laboratorio">Laboratório</a><a href="#wiki">Wiki</a><a href="#auditoria">Autoteste</a><a href="./legacy.html">Laboratório anterior</a>
      </nav>
      <main>
        <section className="hero" id="inicio"><span className="eyebrow">Aprenda fazendo</span><h1>Entenda uma API, campo por campo.</h1><p>Monte uma requisição, veja o código gerado e simule a resposta. Todos os dados ficam nesta aba; nenhum pedido é enviado à URL que você digitar.</p><a className="primary-link" href="#laboratorio">Começar a simular →</a></section>
        <section id="exemplos"><h2>Escolha um exemplo</h2><p className="intro">Os botões preenchem os campos. Execute a simulação quando estiver pronto.</p><div className="preset-grid">{PRESETS.map(preset => <button className="preset" key={preset.label} onClick={() => selectPreset(preset.changes)}><strong>{preset.label}</strong><span>{preset.description}</span></button>)}</div></section>
        <section id="laboratorio"><h2>Laboratório HTTP</h2><p className="intro">Preencha os campos e acompanhe a requisição. Os exemplos usam dados fictícios.</p><div className="lab-grid">
          <form className="panel form" onSubmit={event => { event.preventDefault(); simulate(); }} noValidate>
            <div className="form-head"><h3>1. Monte a requisição</h3><span className="badge">Simulação local</span></div>
            <div className="two-col"><label>Método HTTP <select value={request.method} onChange={event => update('method', event.target.value as LabRequest['method'])}>{ApiLabCore.METHODS.map(method => <option key={method}>{method}</option>)}</select><small>GET consulta; POST cria; PUT substitui; PATCH altera parte; DELETE remove.</small></label>
            <label>Formato de saída <select value={request.format} onChange={event => update('format', event.target.value as OutputFormat)}>{OUTPUT_FORMATS.map(format => <option value={format.value} key={format.value}>{format.label}</option>)}</select></label></div>
            <label>Base URL <input value={request.base} onChange={event => update('base', event.target.value)} placeholder="https://api.exemplo.dev" aria-invalid={generated.errors.some(error => error.field === 'base')} /><small>Endereço inicial, com https://. A simulação não acessa esse endereço.</small></label>
            <div className="two-col"><label>Recurso <input value={request.resource} onChange={event => update('resource', event.target.value)} placeholder="alunos" aria-invalid={generated.errors.some(error => error.field === 'resource')} /><small>Escreva alunos para usar os registros de exemplo.</small></label><label>ID do registro <input value={request.id} onChange={event => update('id', event.target.value)} placeholder="42" aria-invalid={generated.errors.some(error => error.field === 'rid')} /><small>Obrigatório em PUT, PATCH e DELETE; vazio em POST.</small></label></div>
            <fieldset><legend>Query params (filtros opcionais)</legend><p className="field-hint">Exemplo: chave status e valor ativo gera ?status=ativo.</p>{request.queries.map((query, index) => <div className="entry-row" key={index}><input aria-label={`Chave do parâmetro ${index + 1}`} placeholder="status" value={query.key} onChange={event => update('queries', request.queries.map((item, i) => i === index ? { ...item, key: event.target.value } : item))}/><input aria-label={`Valor do parâmetro ${index + 1}`} placeholder="ativo" value={query.value} onChange={event => update('queries', request.queries.map((item, i) => i === index ? { ...item, value: event.target.value } : item))}/><button type="button" onClick={() => update('queries', request.queries.filter((_, i) => i !== index))} aria-label={`Remover parâmetro ${index + 1}`}>×</button></div>)}<button type="button" onClick={() => update('queries', [...request.queries, { key: '', value: '' }])}>+ Adicionar filtro</button></fieldset>
            <div className="two-col"><label>Nome do header <input value={request.headerKey} onChange={event => update('headerKey', event.target.value)} placeholder="X-API-Key" /><small>Opcional; não inclua dois pontos.</small></label><label>Valor do header <input value={request.headerValue} onChange={event => update('headerValue', event.target.value)} placeholder="chave-teste" /><small>Use apenas um valor inventado.</small></label></div>
            <label>Token Bearer (fictício) <input value={request.auth} onChange={event => update('auth', event.target.value)} placeholder="token-teste" autoComplete="off" /><small>Opcional. Não insira credenciais reais.</small></label>
            <label>Body JSON <textarea value={request.body} onChange={event => update('body', event.target.value)} placeholder={'{"nome":"Maria","curso":"ADS"}'} rows={5} aria-invalid={generated.errors.some(error => error.field === 'body')} /><small>Obrigatório em POST, PUT e PATCH. Use aspas duplas.</small></label>
            {generated.errors.length > 0 && <div className="alert" role="alert"><strong>Revise estes campos:</strong><ul>{generated.errors.map((error, index) => <li key={`${error.field}-${index}`}>{error.message}</li>)}</ul></div>}
            {generated.warnings.length > 0 && <div className="notice">{generated.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
            <div className="button-row"><button className="primary" type="submit">Simular resposta</button><button type="button" onClick={() => { database.current = ApiLabCore.newDatabase(); setResponse(null); setMessage('Registros de exemplo restaurados.'); }}>Restaurar registros</button></div>
          </form>
          <div className="result-column"><section className="panel"><h3>2. Requisição gerada</h3><p className="field-hint">{generated.ok ? generated.url : 'Preencha os campos para gerar uma requisição.'}</p><pre aria-label="Código da requisição"><code>{generated.ok ? generated.output : 'O exemplo aparecerá aqui.'}</code></pre><button onClick={copyOutput} disabled={!generated.ok}>Copiar código</button></section>
          <section className="panel"><h3>3. Resposta simulada</h3>{response ? <><p className={`status ${response.status >= 400 ? 'error' : 'success'}`}>{response.status} {response.statusText}</p><p className="field-hint">{response.status === 204 || request.method === 'HEAD' ? 'Esta resposta não tem corpo.' : 'Body da resposta:'}</p>{response.body !== null && <pre><code>{JSON.stringify(response.body, null, 2)}</code></pre>}{response.headers && <pre><code>{JSON.stringify(response.headers, null, 2)}</code></pre>}{response.hint && <p>{response.hint}</p>}</> : <p>Faça uma simulação para ver o status, os dados e os cabeçalhos.</p>}
          <details><summary>Experimentar erros HTTP</summary><div className="button-row">{ERROR_CODES.map(code => <button key={code} onClick={() => simulate(code)}>{code}</button>)}</div><small>Erros forçados servem para estudo e não alteram os registros.</small></details></section></div>
        </div>{message && <p role="status" className="feedback">{message}</p>}</section>
        <section id="wiki"><h2>Wiki dos campos</h2><p className="intro">Abra o campo que gerou dúvida; cada item tem um exemplo para copiar.</p><div className="wiki-grid">{WIKI_FIELDS.map(field => <details className="wiki-item" key={field.name}><summary>{field.name}</summary><p><strong>O que é:</strong> {field.meaning}</p><p><strong>Exemplo:</strong> <code>{field.example}</code></p><p><strong>Quando usar:</strong> {field.use}</p><p><strong>Erro comum:</strong> {field.mistake}</p></details>)}</div></section>
        <section id="auditoria" className="panel audit"><h2>Autoteste e auditoria</h2><p>Executa as combinações e verificações do motor de simulação nesta página.</p><button className="primary" onClick={() => setAudit(ApiLabCore.audit())}>Executar auditoria completa</button>{audit && <div role="status"><p><strong>{audit.passed} de {audit.total} verificações passaram.</strong></p><p>{audit.failures.length === 0 ? 'Nenhuma falha encontrada.' : `${audit.failures.length} falhas encontradas.`}</p>{audit.failures.length > 0 && <pre>{JSON.stringify(audit.failures.slice(0, 5), null, 2)}</pre>}</div>}</section>
        <footer>API Lab Faculdade · {APP_DISPLAY_VERSION} · Simulação educacional local. <a href="./legacy.html">Abrir atividades da versão anterior</a></footer>
      </main>
    </div>
  </div>;
}
