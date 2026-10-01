describe('Independent user tests with the real backend', () => {
  const user = { firstName: 'John', lastName: 'Doe', login: '', password: 'Password123!' };
  let registered = false;
  let token = '';
  const visitRegistration = () => {
    cy.intercept('POST', '/api/register').as('register');
    cy.visit('/register');
  };

  // Setup uses real APIs; each test exercises its own feature through the UI.
  const createAccount = () => cy.request({
    method: 'POST', url: '/api/register', body: user, log: false
  }).then((response) => {
    registered = response.status === 201;
    expect(response.status).to.eq(201);
  });

  const loginViaApi = () => {
    createAccount();
    return cy.request<string>({
      method: 'POST', url: '/api/login',
      body: { login: user.login, password: user.password }, log: false
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.a('string').and.not.be.empty;
      token = response.body;
    });
  };

  before(() => {
    cy.task('db:checkConnection', null, { log: false });
  });

  beforeEach(() => {
    registered = false;
    token = '';
    user.login = `e2e_${Date.now()}_${Cypress._.random(0, 1_000_000)}`;
  });

  afterEach(() => {
    cy.task<{ users: number }>('db:cleanupTestData', user.login).then((deleted) => {
      if (registered) {
        expect(deleted.users, 'registered account deleted').to.eq(1);
      } else {
        expect(deleted.users).to.be.within(0, 1);
      }
    });
  });

  it('[E2E-01] registers a user', () => {
    visitRegistration();
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('successAlert');
    });
    cy.contains('h5', 'Registration Form').should('be.visible');
    Object.entries(user).forEach(([field, value]) => {
      cy.get(`input[formControlName="${field}"]`).type(value, { log: field !== 'password' });
    });
    cy.contains('button', /^Register$/).click();
    cy.wait('@register').then(({ request, response }) => {
      registered = response?.statusCode === 201;
      expect(request.body).to.deep.equal(user);
      expect(response?.statusCode).to.eq(201);
    });
    cy.get('@successAlert').should('have.been.calledOnceWithExactly', 'SUCCESS!! :-)');
    cy.location('pathname').should('eq', '/login');
  });

  it('[E2E-02] logs in', () => {
    createAccount();
    cy.visit('/login');
    cy.intercept('POST', '/api/login').as('login');
    cy.get('input[formControlName="login"]').type(user.login);
    cy.get('input[formControlName="password"]').type(user.password, { log: false });
    cy.contains('button', /^Login$/).click();
    cy.wait('@login').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body).to.be.a('string').and.not.be.empty;
    });
    cy.location('pathname').should('eq', '/login');
    cy.contains('button', 'Logout').should('be.visible');
    cy.window().should((win) => {
      expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    });
  });

  it('[E2E-06] logs out', () => {
    loginViaApi();
    cy.visit('/login', {
      onBeforeLoad(win) { win.localStorage.setItem('token', token); }
    });
    cy.contains('button', 'Logout').click();
    cy.location('pathname').should('eq', '/login');
    cy.window().should((win) => {
      expect(win.localStorage.getItem('token')).to.be.null;
    });
    cy.reload();
    cy.location('pathname').should('eq', '/login');
  });

  it('[E2E-07] shows required errors without submitting an empty form', () => {
    visitRegistration();
    cy.contains('button', /^Register$/).click();

    ['First Name', 'Last Name', 'Login', 'password'].forEach((label) => {
      cy.contains('.invalid-feedback', `${label} is required`).should('be.visible');
    });
    cy.get('input.is-invalid').should('have.length', 4);
    cy.location('pathname').should('eq', '/register');
    cy.get('@register.all').should('have.length', 0);
  });

  it('[E2E-08] clears values and validation errors when cancelling', () => {
    visitRegistration();
    cy.contains('button', /^Register$/).click();
    cy.get('.invalid-feedback').should('have.length', 4);
    // Leave one field empty so cancellation also clears a visible error.
    cy.get('input[formControlName="firstName"]').type(user.firstName);
    cy.get('input[formControlName="lastName"]').type(user.lastName);
    cy.get('input[formControlName="login"]').type(user.login);
    cy.get('button[type="reset"]').click();

    Object.keys(user).forEach((field) => {
      cy.get(`input[formControlName="${field}"]`).should('have.value', '');
    });
    cy.get('.invalid-feedback').should('not.exist');
    cy.get('input.is-invalid').should('not.exist');
    cy.location('pathname').should('eq', '/register');
    cy.get('@register.all').should('have.length', 0);
  });
});
