# DataShare Frontend

Application Angular de DataShare. Elle permet de créer un compte, de se
connecter, de sélectionner et téléverser un fichier, de partager son lien de
téléchargement et de gérer les fichiers de l'utilisateur.

## Fonctionnalités

- page d'accueil responsive ;
- création de compte et connexion ;
- conservation du JWT et ajout automatique dans les requêtes protégées ;
- sélection et validation d'un fichier avant upload ;
- durée d'expiration de 1 à 7 jours ;
- mot de passe de téléchargement optionnel ;
- affichage et copie du lien de partage ;
- téléchargement public à partir d'un token ;
- espace utilisateur avec filtres tous, actifs et expirés ;
- téléchargement et suppression depuis l'historique ;
- interface adaptée aux écrans mobiles et desktop.

## Technologies

- Angular 19 ;
- TypeScript 5.7 ;
- Angular Router et formulaires réactifs ;
- Angular Material et CDK ;
- RxJS ;
- Jest et Angular TestBed ;
- Cypress et Mochawesome ;
- npm et Angular CLI.

## Prérequis

- Node.js compatible avec Angular 19 ;
- npm ;
- API DataShare démarrée sur `http://localhost:8080` pour les parcours réels ;
- un navigateur récent.

## Installation

Depuis le répertoire `front_end` :

```bash
npm ci
```

`npm ci` utilise exactement les versions enregistrées dans `package-lock.json`
et convient aux installations reproductibles et à la CI.

## Démarrage

Démarrer d'abord le back-end sur le port `8080`, puis lancer le front-end :

```bash
npm start
```

Ouvrir ensuite :

```text
http://localhost:4200
```

Le serveur Angular utilise `proxy.conf.json`. Toutes les requêtes commençant
par `/api` sont transférées vers `http://localhost:8080`, ce qui évite de coder
l'adresse du back-end dans les services Angular pendant le développement.

Le rechargement automatique est activé lorsqu'un fichier source est modifié.

## Routes

| URL | Composant | Description | Protection front |
| --- | --- | --- | --- |
| `/` | `HomeComponent` | Accueil et sélection d'un fichier | Publique |
| `/register` | `RegisterComponent` | Création d'un compte | Publique |
| `/login` | `LoginComponent` | Connexion | Publique |
| `/upload` | `UploadComponent` | Paramètres et envoi du fichier | L'API d'upload exige un JWT |
| `/download?token=...` | `DownloadComponent` | Informations et téléchargement partagé | Publique |
| `/compte` | `CompteComponent` | Historique des fichiers | `authGuard` |

Une URL inconnue redirige vers `/login`.

## Authentification

Après une connexion réussie, le JWT renvoyé par le back-end est enregistré dans
le `localStorage`. `authInterceptor` ajoute automatiquement l'en-tête suivant
aux appels HTTP lorsque le token existe :

```http
Authorization: Bearer <jwt>
```

`authGuard` empêche l'accès à `/compte` lorsque le token est absent et redirige
l'utilisateur vers `/login`. Le back-end reste responsable de la validation
réelle du JWT et des droits d'accès.

La déconnexion supprime le token du `localStorage`.

## Upload et validation

Le fichier sélectionné sur la page d'accueil est conservé temporairement dans
le service front, puis affiché sur `/upload`. L'envoi réel commence seulement
lorsque l'utilisateur clique sur **Téléverser**.

Les validations front-end appliquent les règles suivantes :

- taille maximale : 1 Gio ;
- extensions `.exe` et `.bat` interdites ;
- expiration comprise entre 1 et 7 jours ;
- mot de passe de téléchargement facultatif.

Ces contrôles améliorent l'expérience utilisateur, mais le back-end répète les
validations importantes afin qu'elles ne puissent pas être contournées.

## Organisation du code

```text
src/app/
├── core/
│   ├── guards/          protection des routes
│   ├── interceptors/    ajout du JWT
│   ├── models/          modèles TypeScript
│   ├── service/         appels vers l'API
│   └── utils/           validation et calcul d'expiration
├── pages/
│   ├── home/
│   ├── login/
│   ├── register/
│   ├── upload/
│   ├── download/
│   └── compte/
└── shared/              modules et éléments partagés
```

Les ressources SVG se trouvent dans `public/`.

## Tests unitaires

Exécuter les tests Jest :

```bash
npm test -- --runInBand
```

Exécuter les tests avec la couverture :

```bash
npm run test:coverage -- --runInBand
```

Le rapport HTML est généré dans `coverage/`. Le seuil global minimal configuré
est de 80 % pour les instructions, branches, fonctions et lignes.

Lors de la dernière vérification documentée, les 11 suites et 89 tests ont
réussi. La couverture des lignes était de 98,82 %.

Le mode interactif pour le développement est disponible avec :

```bash
npm run test:watch
```

## Tests end-to-end

Cypress couvre le parcours principal avec un compte fixe : connexion, upload,
accès à l'espace utilisateur, téléchargement et suppression.

Copier `.env.e2e.example` vers `.env.e2e`, puis renseigner :

```dotenv
E2E_LOGIN=e2e@datashare.test
E2E_PASSWORD=<mot-de-passe-du-compte-fixe>
E2E_API_URL=http://localhost:8080
```

Démarrer le back-end et le front-end, puis exécuter :

```bash
npm run e2e
```

Pour ouvrir Cypress en mode interactif :

```bash
npm run e2e:open
```

Les rapports Mochawesome sont créés dans `cypress/reports/`.

Le scénario génère uniquement des fichiers dont le nom commence par `e2e-`.
Avant et après le test, une tâche se connecte au back-end et supprime par l'API
les fichiers de ce préfixe appartenant au compte E2E. Il ne faut donc jamais
utiliser ce préfixe pour un vrai fichier du compte de test.

Le prototype utilise actuellement le même Supabase pour les données E2E et les
données de démonstration. Un environnement séparé est recommandé avant une
utilisation en production.

## Build

Créer le build de production :

```bash
npm run build -- --no-progress
```

Les fichiers générés sont placés dans :

```text
dist/etudiant-frontend/browser/
```

Angular applique les budgets suivants :

| Ressource | Avertissement | Erreur |
| --- | ---: | ---: |
| Bundle initial | 500 kB | 1 MB |
| Style d'un composant | 4 kB | 8 kB |

Lors de la dernière vérification, le build a réussi avec un bundle initial de
689,87 kB. Il dépasse le seuil d'avertissement de 500 kB mais reste inférieur
au seuil d'erreur de 1 MB.

## Commandes utiles

| Commande | Utilité |
| --- | --- |
| `npm start` | Démarrer le serveur de développement |
| `npm run build` | Générer le build de production |
| `npm run watch` | Compiler en continu en mode développement |
| `npm test` | Exécuter les tests Jest |
| `npm run test:coverage` | Générer la couverture Jest |
| `npm run e2e` | Exécuter Cypress en mode headless |
| `npm run e2e:open` | Ouvrir l'interface Cypress |

## Sécurité

Le front-end ne contient aucune clé Supabase ni aucun secret de base de
données. Toutes les opérations sensibles passent par le back-end. Le JWT est
actuellement conservé dans `localStorage` ; une politique CSP stricte et une
protection contre les injections XSS sont donc nécessaires en production.

Les validations réalisées dans le navigateur ne sont jamais considérées comme
une protection suffisante : le serveur doit toujours vérifier les fichiers,
les identités, les droits et les dates d'expiration.
