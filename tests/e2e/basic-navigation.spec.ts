import { test, expect } from '@playwright/test';

test.describe('Wave Terminal - Main Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the main interface', async ({ page }) => {
    await expect(page.locator('[data-testid="terminal-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-panel"]')).toBeVisible();
  });

  test('should handle terminal input', async ({ page }) => {
    const terminalInput = page.locator('[data-testid="terminal-input"]');
    await terminalInput.click();
    await terminalInput.fill('echo "Hello World"');
    await terminalInput.press('Enter');
    
    await expect(page.locator('text=Hello World')).toBeVisible();
  });

  test('should display AI suggestions', async ({ page }) => {
    const terminalInput = page.locator('[data-testid="terminal-input"]');
    await terminalInput.click();
    await terminalInput.fill('git ');
    
    await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-suggestions"]')).toContainText('git');
  });

  test('should create new blocks', async ({ page }) => {
    await page.click('[data-testid="add-block-button"]');
    await expect(page.locator('[data-testid="block-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="block-type-select"]', 'terminal');
    await page.fill('[data-testid="block-title-input"]', 'Test Terminal Block');
    await page.click('[data-testid="create-block-button"]');
    
    await expect(page.locator('text=Test Terminal Block')).toBeVisible();
  });
});