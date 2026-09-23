import { test, expect } from '@playwright/test';

test('um iniciante cria um registro e vê a resposta', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar aluno' }).click();
  await page.getByRole('button', { name: 'Simular resposta' }).click();
  await expect(page.getByText('201 Created')).toBeVisible();
  await expect(page.getByText('Nenhuma chamada foi enviada à URL.')).toBeVisible();
});
test('o tema e a navegação funcionam no celular', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await expect(page.locator('.theme-dark')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Seções' })).toBeVisible();
});

test('idioma em desenvolvimento avisa e mantém o português', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher idioma' }).click();
  await page.getByRole('button', { name: /English/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Language under development' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Entenda uma API, campo por campo.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escolher idioma' })).toContainText('PT');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
});
