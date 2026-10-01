# EtudiantFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.16.

The application contains only user registration (`/register`) and login (`/login`) pages. The default route opens the login page.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Jest](https://jestjs.io/) test runner, use the following command:

```bash
jest
```

## Running end-to-end tests

Cypress tests user registration, login, logout and form validation against the real backend and MySQL, with automatic cleanup after each test.
Start the backend on `http://localhost:8080`, configure `.env.e2e` with the database credentials and current Docker-mapped MySQL port, then start the frontend with `npm start -- --proxy-config proxy.conf.json`.
Run `npm run e2e` to generate Mochawesome HTML/JSON execution reports in `cypress/reports/`, or `npm run e2e:open` for interactive testing.
The command fails if any test fails or the pass rate (passed tests / total tests in this run) is below `minimumPassPercentage` in `cypress/scenarios.json` (80%). The scenario list is for reference only; this is not code coverage.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
