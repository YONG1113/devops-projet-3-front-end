describe('File lifecycle with the fixed E2E account', () => {
  let login: string;
  let password: string;
  let filename: string;
  let fileContent: string;

  before(() => {
    cy.env(['e2eLogin', 'e2ePassword', 'testFilePrefix']).then((environment) => {
      login = environment['e2eLogin'] as string;
      password = environment['e2ePassword'] as string;
      const prefix = environment['testFilePrefix'] as string;
      expect(login, 'E2E_LOGIN').to.be.a('string').and.not.be.empty;
      expect(password, 'E2E_PASSWORD').to.be.a('string').and.not.be.empty;
      filename = `${prefix}${Date.now()}-${Cypress._.random(0, 1_000_000)}.txt`;
      fileContent = `DataShare Cypress test file: ${filename}`;
    });
    cy.task('cleanupE2eFiles', null, { log: false });
  });

  after(() => {
    cy.task('cleanupE2eFiles', null, { log: false });
  });

  it('logs in, uploads, finds, downloads and deletes a file', () => {
    cy.intercept('POST', '/api/login').as('login');
    cy.visit('/login');
    cy.window().then((window) => cy.stub(window, 'alert').as('loginAlert'));
    cy.get('#login').type(login);
    cy.get('#password').type(password, { log: false });
    cy.contains('button', /^Connexion$/).click();
    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('eq', '/');
    cy.window().its('localStorage.token').should((token) => {
      expect(token).to.be.a('string').and.not.be.empty;
    });

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName: filename,
      mimeType: 'text/plain',
    }, { force: true });
    cy.location('pathname').should('eq', '/upload');
    cy.contains(filename).should('be.visible');

    cy.intercept('POST', '/api/file').as('uploadFile');
    cy.get('#expirationDays').select('3 jours');
    cy.get('button.televerser-button').should('be.enabled').click();
    cy.wait('@uploadFile').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.filename).to.eq(filename);
    });
    cy.get('.upload-success').should('be.visible');
    cy.contains('Félicitations, ton fichier sera conservé chez nous pendant 3 jours !')
      .should('be.visible');
    cy.get('.download-link').should('have.attr', 'href').then((href) => {
      expect(href).to.include('/download');
    });

    cy.intercept('GET', '/api/files').as('getFiles');
    cy.contains('button', 'Mon espace').click();
    cy.location('pathname').should('eq', '/compte');
    cy.wait('@getFiles').its('response.statusCode').should('eq', 200);
    cy.contains('.file-row strong', filename)
      .closest('.file-row')
      .as('uploadedFileRow')
      .should('be.visible');

    cy.intercept('GET', '/api/file/info*').as('fileInfo');
    cy.get('@uploadedFileRow').contains('button', 'Accéder').click();
    cy.location('pathname').should('eq', '/download');
    cy.wait('@fileInfo').its('response.statusCode').should('eq', 200);
    cy.contains(filename).should('be.visible');

    cy.intercept('GET', '/api/file/download*').as('downloadFile');
    cy.get('button.download-button').should('be.enabled').click();
    cy.wait('@downloadFile').its('response.statusCode').should('eq', 200);
    cy.contains('Téléchargement terminé.').should('be.visible');
    cy.readFile(`cypress/downloads/${filename}`).should('eq', fileContent);

    cy.intercept('GET', '/api/files').as('reloadFiles');
    cy.visit('/compte');
    cy.wait('@reloadFiles').its('response.statusCode').should('eq', 200);
    cy.contains('.file-row strong', filename)
      .closest('.file-row')
      .as('fileToDelete');

    cy.on('window:confirm', () => true);
    cy.intercept('DELETE', '/api/file/*').as('deleteFile');
    cy.get('@fileToDelete').contains('button', 'Supprimer').click();
    cy.wait('@deleteFile').its('response.statusCode').should('eq', 204);
    cy.contains('.file-row strong', filename).should('not.exist');
  });
});
