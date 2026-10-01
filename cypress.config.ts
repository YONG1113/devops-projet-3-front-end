import { defineConfig } from 'cypress';
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { createConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// Credentials stay in Node and are never exposed through Cypress.env().
config({ path: '.env.e2e', quiet: true });

async function databaseConnection() {
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    if (!process.env[key]) {
      throw new Error(`Missing ${key}: configure .env.e2e before running E2E tests.`);
    }
  }
  return createConnection({
    host: process.env['DB_HOST'],
    port: Number(process.env['DB_PORT']),
    user: process.env['DB_USER'],
    password: process.env['DB_PASSWORD'],
    database: process.env['DB_NAME'],
    connectTimeout: 10000
  });
}

export default defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    reportFilename: 'e2e-report',
    overwrite: false,
    html: true,
    json: true
  },
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    setupNodeEvents(on) {
      on('after:run', (results) => {
        if (!('totalTests' in results)) {
          throw new Error('Cypress did not complete the test run.');
        }

        const { minimumPassPercentage } = JSON.parse(
          readFileSync('cypress/scenarios.json', 'utf8')
        );
        const percentage = results.totalTests > 0
          ? results.totalPassed / results.totalTests * 100
          : 0;

        console.log(`E2E pass rate: ${percentage.toFixed(2)}%`);

        if (percentage < minimumPassPercentage) {
          throw new Error(`E2E pass rate must be at least ${minimumPassPercentage}%.`);
        }
      });

      on('task', {
        async 'db:checkConnection'() {
          const connection = await databaseConnection();
          try {
            await connection.query('SELECT 1 FROM `user` LIMIT 1');
            return null;
          } finally {
            await connection.end();
          }
        },
        async 'db:cleanupTestData'(login: string) {
          if (typeof login !== 'string' || !/^e2e_[0-9]+_[0-9]+$/.test(login)) {
            throw new Error('Cleanup only accepts a generated E2E login.');
          }
          const connection = await databaseConnection();
          try {
            await connection.beginTransaction();
            const [result] = await connection.execute<ResultSetHeader>(
              'DELETE FROM `user` WHERE login = ?', [login]
            );
            const [remaining] = await connection.execute<RowDataPacket[]>(
              'SELECT id FROM `user` WHERE login = ?', [login]
            );
            if (remaining.length !== 0) {
              throw new Error('Test account still exists after cleanup.');
            }
            await connection.commit();
            return { users: result.affectedRows };
          } catch (error) {
            await connection.rollback();
            throw error;
          } finally {
            await connection.end();
          }
        }
      });
    }
  }
});
