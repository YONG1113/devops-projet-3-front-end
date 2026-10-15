# Sécurité — DataShare

Analyse réalisée le **13 octobre 2026** à partir du code courant, de la configuration Spring Security et d'un scan `npm audit`.

## Résultats du scan de dépendances

Commandes :

```bash
cd front_end
npm audit --omit=dev
npm audit
```

| Périmètre | Faible | Modérée | Élevée | Critique | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dépendances de production | 0 | 3 | 4 | 0 | 7 |
| Arbre complet, outils de développement inclus | 3 | 25 | 71 | 6 | 105 |

Les 7 alertes de production concernent directement les paquets Angular 19 (`@angular/common`, `compiler`, `core`, `forms`, `platform-browser`, `platform-browser-dynamic`, `router`). `npm audit` propose des versions majeures plus récentes ; l'application ne doit pas appliquer un `npm audit fix --force` sans migration Angular et tests de non-régression. Les nombreuses alertes de développement proviennent surtout de la chaîne CLI/build/test et ne sont normalement pas livrées dans le bundle navigateur, mais elles peuvent affecter les postes de développement et la CI.

Aucun scanner CVE Maven automatisé n'est actuellement configuré dans le projet. Le build Maven et ses 87 tests passent, mais cela ne constitue pas un scan de vulnérabilités Java. Ajouter OWASP Dependency-Check, Dependabot ou Renovate en CI est une action prioritaire.

## Mesures déjà présentes

- Mots de passe utilisateur et mots de passe optionnels de téléchargement encodés avec BCrypt.
- Authentification sans session par JWT signé et expirant ; routes métier protégées par défaut.
- Jetons de partage générés avec `SecureRandom` sur 256 bits et fonction SHA-256 disponible.
- Contrôle de propriété pour téléchargement et suppression authentifiés.
- Expiration contrôlée côté serveur avant téléchargement.
- Limite de 1 Gio et blocage des extensions `.exe` et `.bat` côté front et côté back.
- Nom du fichier neutralisé contre l'injection CR/LF dans `Content-Disposition`.
- Réponses de téléchargement avec `Cache-Control: no-store`.
- Secrets injectés par variables d'environnement ; `.env` ne doit jamais être versionné.
- Erreurs inattendues transformées en message générique côté client.

## Constats et décisions

### Priorité critique

1. **Cycle du jeton de téléchargement incohérent.** Le service stocke un SHA-256 dans `download_token_hash`, mais renvoie ce hash au front et recherche directement la valeur reçue. La conception attendue est : renvoyer le jeton brut une seule fois, stocker uniquement son hash, puis hasher le paramètre reçu avant la recherche. Les DTO de liste ne doivent jamais exposer le hash stocké.
2. **Fuite de secrets par les logs.** Le filtre de requêtes enregistre le payload et la query string. Il peut donc journaliser les mots de passe d'inscription/connexion ainsi que `token` et `password` de téléchargement, actuellement placés dans l'URL. Désactiver les payloads sensibles, masquer les champs et transmettre le mot de passe dans un corps `POST`.
3. **Actuator trop exposé.** `management.endpoints.web.exposure.include: '*'` et `/actuator/**.permitAll()` publient 13 endpoints. En production, n'exposer publiquement que `health` avec détails désactivés ; protéger ou désactiver les autres endpoints.

### Priorité élevée

1. Le JWT est conservé dans `localStorage`. Une faille XSS permettrait de le lire. Renforcer la CSP et l'absence d'injection HTML ; envisager un cookie `HttpOnly`, `Secure`, `SameSite` si l'architecture évolue.
2. CORS est désactivé dans Spring Security. Définir explicitement les origines, méthodes et en-têtes autorisés pour le domaine du front.
3. CSRF est désactivé, choix cohérent tant que l'authentification utilise uniquement un header Bearer. Cette décision devra être réévaluée si le JWT passe en cookie.
4. Le contrôle des fichiers repose sur l'extension déclarée et le type MIME fourni. Ajouter détection de type par signature, antivirus et liste d'autorisation selon le niveau de risque.
5. Il n'existe pas de limitation de débit sur connexion, téléchargement public ou upload. Ajouter rate limiting, temporisation et surveillance des tentatives.
6. Un upload sauvegarde les métadonnées avant l'appel Storage ; si l'upload Storage échoue, un enregistrement orphelin peut rester. Revoir l'ordre, la transaction et le mécanisme de compensation.

### Priorité moyenne

- Les messages `User not found` et `Invalid password` diffèrent et facilitent l'énumération des comptes. Renvoyer le même message et un temps de traitement comparable.
- La limite de 1 Gio expose la mémoire et la bande passante : le téléchargement charge actuellement tout le fichier en `byte[]`. Passer à un flux et fixer des timeouts.
- La clé Supabase utilisée par le back doit rester une clé serveur, avec le minimum de privilèges, jamais une clé embarquée dans Angular.
- Le scheduler journalise le chemin Storage en erreur. Éviter toute donnée de partage ou information personnelle dans les logs.
- Les comptes n'ont pas encore de verrouillage, révocation de JWT ni rotation de refresh token.

## Politique des secrets

`DB_PASSWORD`, `JWT_SECRET` et `SUPABASE_SECRET_KEY` doivent être stockés dans le gestionnaire de secrets de l'environnement. Le JWT secret doit être aléatoire, suffisamment long pour l'algorithme HMAC, encodé en Base64 et différent par environnement. Rotation immédiate après fuite suspectée, départ d'un collaborateur ou exposition accidentelle dans Git/logs ; rotation planifiée au minimum tous les 90 jours pour les clés sensibles.

## Critères de sécurité avant production

- 0 vulnérabilité critique ou élevée non acceptée sur les dépendances livrées.
- Correction du cycle hash/jeton de téléchargement et tests associés.
- Aucun mot de passe, JWT, jeton de partage ou secret dans les logs.
- Seul `/actuator/health` est public.
- Tests d'accès croisé entre deux utilisateurs, expiration et brute force du mot de passe de partage.
- Sauvegarde et restauration PostgreSQL vérifiées ; rotation des secrets documentée.

