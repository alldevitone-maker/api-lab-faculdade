import { test, expect } from '@playwright/test';

test('atlas eleitoral carrega geografia oficial e dados TSE completos', async ({ page }) => {
  await page.goto('http://127.0.0.1:4174/jaragua-atlas/index.html');

  await expect(page.locator('#loading-state')).toHaveClass(/is-hidden/, { timeout: 45_000 });
  await expect(page.locator('#map canvas')).toHaveCount(1);
  await expect(page.locator('#coverage-copy')).toContainText('100,00%');
  await expect(page.locator('#hud-source')).toContainText('TSE');

  const search = page.getByRole('searchbox', { name: 'Buscar bairro' });
  await search.fill('Centro');
  await page.getByRole('button', { name: 'CENTRO' }).click();

  await expect(page.locator('#inspector-content h2')).toHaveText('Centro');
  await expect(page.getByText('Todos os 12 candidatos · 2026')).toBeVisible();

  await page.getByRole('button', { name: '2022' }).click();
  await expect(page.locator('#hud-mode')).toContainText('2022 · 1º turno');
  await expect(page.locator('#kpi-valid')).toHaveText('102.563');
  await expect(page.getByText('Válidos · 1º turno')).toBeVisible();

  await page.getByRole('button', { name: 'Consolidado' }).click();
  await expect(page.locator('#hud-mode')).toContainText('2022 → 2026 · 1º turno');
  await expect(page.getByText('Δ da margem')).toBeVisible();
});
