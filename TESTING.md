# Plan de tests — DataShare

Dernière exécution documentée : **13 octobre 2026**.

## Objectif et périmètre

La stratégie couvre le front Angular, l'API Spring Boot, PostgreSQL et les échanges avec Supabase Storage. Les tests automatisés vérifient les règles métier, les contrôleurs, la sécurité JWT, les repositories et les principaux parcours utilisateur. Les appels réels à Supabase Storage restent à valider dans un environnement d'intégration : les tests unitaires utilisent des doublures pour éviter de modifier le bucket.

## Niveaux de test

| Niveau           | Outils                                    | Périmètre                                                            | Dépendances externes                            |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| Unitaire front   | Jest, Angular TestBed                     | composants, services HTTP, validation et calcul d'expiration         | aucune                                          |
| Unitaire back    | JUnit 5, Mockito, Spring Security Test    | services, contrôleurs, DTO, gestion d'erreurs, JWT, scheduler        | aucune                                          |
| Intégration back | Spring Boot Test, MockMvc, Testcontainers | inscription, connexion, upload, suppression, listing et repositories | Docker, PostgreSQL 17 éphémère                  |
| End-to-end       | Cypress                                   | connexion, upload, historique, téléchargement et suppression         | front, back, compte E2E et Supabase disponibles |

## Critères d'acceptation

| Fonction       | Critère attendu                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inscription    | un email valide et un mot de passe d'au moins 8 caractères créent un compte ; un login existant est refusé                                                    |
| Connexion      | des identifiants valides renvoient un JWT ; une erreur d'identification renvoie `401`                                                                         |
| Autorisation   | `/api/me`, `/api/files`, `POST /api/file`, `GET /api/file` et `DELETE /api/file/{id}` exigent un JWT valide                                                   |
| Upload         | fichier non vide, nom <= 255 caractères, taille <= 1 Gio, extension différente de `.exe` et `.bat`, expiration entre 1 et 7 jours                             |
| Isolation      | un utilisateur ne peut ni télécharger ni supprimer le fichier d'un autre utilisateur                                                                          |
| Téléchargement | un fichier actif est rendu en pièce jointe ; un fichier expiré renvoie `410` ; un mot de passe erroné renvoie `403`                                           |
| Nettoyage      | chaque heure, le contenu expiré est supprimé du Storage et les métadonnées sensibles sont vidées ; les erreurs sont journalisées et reprises au cycle suivant |
| Historique     | le compte liste uniquement les fichiers de l'utilisateur et permet les filtres tous/actifs/expirés                                                            |
| Responsive     | les pages principales restent utilisables sur mobile et ordinateur, sans débordement horizontal                                                               |
| Qualité        | tous les tests passent ; couverture back >= 80 % des lignes ; build front réussi ; scénario E2E réussi à 100 %                                                |

## Résultats observés

### Back-end

Commande exécutée :

```bash
cd back_end
sh mvnw clean verify
```

Résultat : **87 tests**, 0 échec, 0 erreur, 0 ignoré. La couverture JaCoCo est de **92,69 % des lignes** (317/342), au-dessus du seuil Maven de 80 %. Le rapport est disponible dans `back_end/target/site/jacoco/index.html`.

### Front-end

Commande exécutée :

```bash
cd front_end
npm run test:coverage -- --runInBand
```

Résultat : **11 suites et 89 tests réussis**. Couverture : 98,44 % des instructions, 91,46 % des branches, 97,40 % des fonctions et **98,82 % des lignes**.

Le build de production réussit avec des avertissements de budget détaillés dans [PERF.md](./PERF.md).

### End-to-end

Le scénario `front_end/cypress/e2e/file-lifecycle.cy.ts` couvre connexion, upload, accès depuis le compte, téléchargement et suppression. Il nettoie avant et après l'exécution uniquement les fichiers dont le nom commence par `e2e-`, via l'API applicative.

Le scénario n'a pas été exécuté lors de cette campagne : le binaire Cypress 16 installé sur la machine rejette ses options de démarrage macOS. Le test nécessite aussi les identifiants du compte fixe dans `.env.e2e`. Il doit donc être vert dans une CI compatible avant livraison.

## Instructions d'exécution

Prérequis : Java 21, Node.js compatible avec Angular 19, npm et Docker actif pour les tests d'intégration PostgreSQL.

```bash
# Back-end, tests + couverture + seuil JaCoCo
cd back_end
sh mvnw clean verify

# Front-end, tests et couverture
cd ../front_end
npm ci
npm run test:coverage -- --runInBand

# Build de production
npm run build -- --no-progress
```

Pour l'E2E, copier `.env.e2e.example` vers `.env.e2e`, renseigner le compte fixe, puis démarrer l'API sur `8080` et le front sur `4200` :

```bash
cd front_end
npm run e2e
```

Ne jamais utiliser un nom de fichier de production commençant par `e2e-` : le nettoyage Cypress supprime tous les fichiers de ce préfixe appartenant au compte de test.

## Tests manuels avant livraison

1. Tester un fichier sans mot de passe, puis avec mot de passe.
2. Vérifier les expirations de 1 et 7 jours et l'affichage aujourd'hui/demain/expiré.
3. Refuser un fichier `.exe`, `.bat`, vide et supérieur à 1 Gio.
4. Contrôler l'accès avec JWT absent, expiré et appartenant à un autre utilisateur.
5. Vérifier le rendu à environ 390 px, 768 px et 1440 px.
6. Vérifier dans Supabase que suppression manuelle et expiration retirent bien l'objet.

## Analyse statique du code

Une analyse statique a été mise en place sur le front-end et le back-end afin
de détecter les erreurs potentielles, les problèmes de qualité et le
non-respect des conventions de développement.

### Front-end — ESLint

Le code Angular et les templates HTML sont analysés avec ESLint et Angular
ESLint.

Commande exécutée :

```bash
cd front_end
npm run lint
```

Résultat observé :

```text
All files pass linting.
```

### Back-end — SpotBugs

Le bytecode Java est analysé avec SpotBugs, intégré au projet Maven.

Commande exécutée :

```bash
cd back_end
sh mvnw compile spotbugs:check
```

Résultat observé :

```text
BugInstance size is 0
Error size is 0
No errors/warnings found
BUILD SUCCESS
```

Les deux analyses statiques se terminent avec succès
