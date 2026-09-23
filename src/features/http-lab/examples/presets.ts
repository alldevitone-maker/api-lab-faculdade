import type { LabRequest } from '../models/request';

// Exemplos fictícios e seguros: o laboratório nunca acessa esta URL.
export const DEFAULT_REQUEST: LabRequest = {
  method: 'GET', format: 'http', base: 'https://api.exemplo.dev', resource: 'alunos',
  id: '', queries: [], headerKey: '', headerValue: '', auth: '', body: ''
};

export const PRESETS: { label: string; description: string; changes: Partial<LabRequest> }[] = [
  { label: 'Listar alunos', description: 'GET consulta a coleção inteira.', changes: { method: 'GET', id: '', body: '', queries: [] } },
  { label: 'Buscar um aluno', description: 'GET com ID encontra um registro.', changes: { method: 'GET', id: '42', body: '', queries: [] } },
  { label: 'Filtrar alunos', description: 'Query params refinam a lista.', changes: { method: 'GET', id: '', body: '', queries: [{ key: 'status', value: 'ativo' }] } },
  { label: 'Criar aluno', description: 'POST cria um registro na memória desta aba.', changes: { method: 'POST', id: '', body: '{"nome":"Maria","curso":"ADS","status":"ativo"}', queries: [] } },
  { label: 'Substituir aluno', description: 'PUT substitui os campos do aluno 42.', changes: { method: 'PUT', id: '42', body: '{"nome":"Maria","curso":"ADS"}', queries: [] } },
  { label: 'Alterar um campo', description: 'PATCH mantém os outros campos.', changes: { method: 'PATCH', id: '42', body: '{"status":"inativo"}', queries: [] } },
  { label: 'Excluir aluno', description: 'DELETE remove um registro local.', changes: { method: 'DELETE', id: '42', body: '', queries: [] } },
  { label: 'Ver metadados', description: 'HEAD mostra cabeçalhos, sem corpo.', changes: { method: 'HEAD', id: '', body: '', queries: [] } },
  { label: 'Ver métodos', description: 'OPTIONS mostra os métodos permitidos.', changes: { method: 'OPTIONS', id: '', body: '', queries: [] } }
];
