import { defineConfig } from 'cypress';
import { readFileSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.e2e', quiet: true });

const testFilePrefix = 'e2e-';

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}: configure it in .env.e2e before running E2E tests.`);
  }
  return value;
}

async function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:8080';
  return fetch(`${apiUrl}${path}`, init);
}

async function login(): Promise<string> {
  const response = await apiRequest('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: requiredEnvironmentValue('E2E_LOGIN'),
      password: requiredEnvironmentValue('E2E_PASSWORD'),
    }),
  });
  if (!response.ok) {
    throw new Error(`E2E account login failed with HTTP ${response.status}.`);
  }
  return response.text();
}

async function cleanupE2eFiles(): Promise<{ deleted: number }> {
  const token = await login();
  const filesResponse = await apiRequest('/api/files', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!filesResponse.ok) {
    throw new Error(`Cannot list E2E files: HTTP ${filesResponse.status}.`);
  }

  const files = await filesResponse.json() as Array<{ id: number; filename: string }>;
  const testFiles = files.filter((file) => file.filename.startsWith(testFilePrefix));
  for (const file of testFiles) {
    const deleteResponse = await apiRequest(`/api/file/${file.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!deleteResponse.ok) {
      throw new Error(`Cannot delete E2E file ${file.id}: HTTP ${deleteResponse.status}.`);
    }
  }
  return { deleted: testFiles.length };
}

export default defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    reportFilename: 'e2e-report',
    overwrite: false,
    html: true,
    json: true,
  },
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    env: {
      e2eLogin: process.env['E2E_LOGIN'],
      e2ePassword: process.env['E2E_PASSWORD'],
      testFilePrefix,
    },
    setupNodeEvents(on) {
      on('task', { cleanupE2eFiles });
      on('after:run', (results) => {
        if (!('totalTests' in results)) {
          throw new Error('Cypress did not complete the test run.');
        }
        const { minimumPassPercentage } = JSON.parse(
          readFileSync('cypress/scenarios.json', 'utf8'),
        );
        const percentage = results.totalTests > 0
          ? results.totalPassed / results.totalTests * 100
          : 0;
        console.log(`E2E pass rate: ${percentage.toFixed(2)}%`);
        if (percentage < minimumPassPercentage) {
          throw new Error(`E2E pass rate must be at least ${minimumPassPercentage}%.`);
        }
      });
    },
  },
});
