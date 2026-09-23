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
