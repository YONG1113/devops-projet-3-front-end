# Maintenance — DataShare

## Responsabilités et fréquence

| Fréquence | Opération |
| --- | --- |
| À chaque changement | tests unitaires, intégration, build front, revue des migrations et secrets |
| Hebdomadaire | `npm audit`, vérification des échecs du nettoyage, espace du bucket et erreurs 4xx/5xx |
| Mensuelle | mises à jour correctives Java/Angular, scan Maven, restauration d'une sauvegarde de test |
| Trimestrielle | mises à jour mineures/majeures planifiées, rotation des secrets, revue des droits Supabase |
| Annuelle | exercice de reprise, revue de l'architecture et politique de conservation |

## Mise à jour du front-end

1. Créer une branche et conserver `package-lock.json`.
2. Examiner les versions avec `npm outdated` et les avis avec `npm audit`.
3. Mettre à jour Angular avec `ng update` par version majeure, sans `npm audit fix --force` automatique.
4. Réinstaller de manière reproductible avec `npm ci`.
5. Exécuter Jest, build, Cypress, puis vérifier les budgets et le responsive.

```bash
cd front_end
npm ci
npm run test:coverage -- --runInBand
npm run build -- --no-progress
npm run e2e
```

Risques principaux : incompatibilité Angular/TypeScript/Material, changement des builders, régression du routing/guard/interceptor, augmentation du bundle et rupture du binaire Cypress. Prévoir une mise à jour dédiée de Cypress si la version courante reste incompatible avec le poste ou la CI.

## Mise à jour du back-end

1. Examiner Spring Boot, JJWT, PostgreSQL, MapStruct, Lombok et Testcontainers.
2. Effectuer les mises à jour Spring Boot via une branche séparée et lire les notes de migration.
3. Lancer l'analyse CVE Maven puis la vérification complète.
4. Déployer d'abord dans un environnement de validation et vérifier Supabase DB/Storage.

```bash
cd back_end
sh mvnw clean verify
```

Risques principaux : changement Spring Security, format ou validation JWT, mapping Hibernate, pilote PostgreSQL, API Supabase Storage et comportement des tâches planifiées.

## Évolution de la base de données

Hibernate utilise `ddl-auto: validate` : le schéma n'est pas modifié automatiquement. Toute évolution de `data_user` ou `data_file` doit passer par un script SQL versionné, idéalement Flyway ou Liquibase.

Procédure : sauvegarder la base, tester la migration sur une copie, appliquer les ajouts rétrocompatibles, déployer le code, contrôler les logs, puis supprimer les anciennes colonnes dans une livraison ultérieure. Pour un rollback, restaurer le code précédent et appliquer un script inverse seulement s'il est sans perte ; sinon restaurer la sauvegarde.

Les index attendus couvrent au minimum `data_file.user_id`, `data_file.expires_at` et l'unicité de `download_token_hash`. Vérifier les plans de requête lorsque le volume augmente.

## Supabase Storage et expiration

`ExpiredFileCleanupScheduler` s'exécute au début de chaque heure (`0 0 * * * *`). Il supprime d'abord l'objet Storage, puis conserve `id`, utilisateur, nom original, expiration et jeton, tout en vidant les autres métadonnées.

Surveiller les messages `Failed to clean up expired file`. Une erreur laisse l'enregistrement disponible pour une nouvelle tentative au prochain passage. Mettre en place une alerte si des fichiers expirés avec `object_path` non nul persistent plus de deux heures. Avant toute modification du scheduler, tester l'idempotence et empêcher deux instances de traiter le même objet simultanément, par verrou distribué ou job unique.

## Sauvegarde et reprise

- Sauvegarder PostgreSQL quotidiennement avec une rétention adaptée au prototype.
- Vérifier les mécanismes de sauvegarde Supabase et tester une restauration mensuelle.
- Les objets Storage et les métadonnées doivent rester cohérents ; inventorier périodiquement les objets orphelins.
- Documenter le RPO/RTO avant production. Proposition initiale : RPO 24 h, RTO 4 h.
- Ne jamais restaurer un fichier déjà expiré sans réappliquer la politique d'expiration.

## Gestion des secrets

Les fichiers `.env` et `.env.local` restent locaux et hors Git. Maintenir un `.env.example` sans valeur réelle. Injecter en production `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` et `SUPABASE_BUCKET` depuis un gestionnaire de secrets.

Après rotation : mettre à jour le secret de l'environnement, redémarrer l'application, vérifier `/actuator/health`, tester connexion/upload/download, puis révoquer l'ancienne clé. La rotation du JWT invalide tous les JWT actifs et doit être annoncée.

## Procédure de livraison et rollback

1. Tests et scans verts ; sauvegarde disponible.
2. Migration DB rétrocompatible.
3. Déploiement du back, contrôle santé et logs.
4. Déploiement du front, smoke test complet.
5. Surveillance accrue pendant au moins 30 minutes.

Rollback : remettre l'artefact précédent, restaurer les variables compatibles, vérifier la compatibilité du schéma, puis exécuter connexion, listing et téléchargement. Ne jamais supprimer manuellement des enregistrements pour corriger un déploiement sans avoir d'abord réconcilié Supabase Storage.

## Registre des risques

| Risque | Impact | Mesure |
| --- | --- | --- |
| même Supabase pour test et production | suppression ou pollution de données | compte dédié, préfixe `e2e-`, droits limités ; séparer les environnements dès que possible |
| nettoyage E2E par préfixe | suppression d'un vrai fichier ayant ce préfixe | réserver officiellement le préfixe et limiter au compte E2E |
| fichier de 1 Gio chargé en mémoire | arrêt JVM ou latence élevée | streaming, limite de concurrence, heap et métriques |
| panne Storage après écriture DB | métadonnée orpheline | transaction/compensation et tâche de réconciliation |
| plusieurs instances du scheduler | double suppression | verrou distribué |
| dépendances obsolètes | vulnérabilité exploitable | scans hebdomadaires et calendrier de migration |
| exposition Actuator/logs | fuite d'informations ou secrets | réduire les endpoints et masquer les données sensibles |

