import { describe, expect, it } from 'vitest';
import { ApiLabCore } from './core';
import { DEFAULT_REQUEST } from '../examples/presets';

describe('simulação didática', () => {
  it('preserva a auditoria original', () => {
    const result = ApiLabCore.audit();
    expect(result.failures).toEqual([]);
    expect(result.passed).toBe(result.total);
    expect(result.total).toBeGreaterThan(1000);
  });
  it('não aceita URL inválida nem JSON quebrado', () => {
    expect(ApiLabCore.generate({ ...DEFAULT_REQUEST, base: 'sem-protocolo' }).ok).toBe(false);
    expect(ApiLabCore.generate({ ...DEFAULT_REQUEST, method: 'POST', body: '{quebrado' }).ok).toBe(false);
  });
  it('cria, altera e remove um registro local', () => {
    const db = ApiLabCore.newDatabase();
    const post = ApiLabCore.simulateRequest({ ...DEFAULT_REQUEST, method: 'POST', body: '{"nome":"Maria"}' }, db);
    expect(post.status).toBe(201);
    const id = String((post.body as { id: number }).id);
    expect(ApiLabCore.simulateRequest({ ...DEFAULT_REQUEST, method: 'PATCH', id, body: '{"curso":"ADS"}' }, db).status).toBe(200);
    expect(ApiLabCore.simulateRequest({ ...DEFAULT_REQUEST, method: 'DELETE', id }, db).status).toBe(204);
    expect(ApiLabCore.simulateRequest({ ...DEFAULT_REQUEST, id }, db).status).toBe(404);
  });
  it('HEAD e OPTIONS não devolvem corpo', () => {
    for (const method of ['HEAD', 'OPTIONS'] as const) expect(ApiLabCore.simulateRequest({ ...DEFAULT_REQUEST, method }, ApiLabCore.newDatabase()).body).toBeNull();
  });
});
