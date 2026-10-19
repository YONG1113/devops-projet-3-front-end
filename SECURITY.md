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

Les alertes de `npm audit` sont principalement liées aux versions d'Angular et des outils de développement. Elles ne viennent pas directement du code de l'application.

Une mise à jour contrôlée des dépendances est nécessaire. La commande `npm audit fix --force` n'est pas utilisée, car elle peut créer des incompatibilités. Après la mise à jour, le lint, les tests et le build devront être exécutés à nouveau.

Aucun scanner CVE Maven automatisé n'est actuellement configuré dans le projet. Le build Maven et ses 87 tests passent, mais cela ne constitue pas un scan de vulnérabilités Java. Ajouter OWASP Dependency-Check, Dependabot ou Renovate en CI est une action prioritaire.

## Mesures déjà présentes

- Mots de passe utilisateur et mots de passe optionnels de téléchargement encodés avec BCrypt.
- Authentification sans session par JWT signé et expirant ; routes métier protégées par défaut.
- Jetons de partage générés avec `SecureRandom` sur 256 bits. Le jeton brut est renvoyé une seule fois après l'upload ; seule son empreinte SHA-256 est stockée en base et la valeur reçue est hachée avant chaque recherche.
- Contrôle de propriété pour téléchargement et suppression authentifiés.
- Expiration contrôlée côté serveur avant téléchargement.
- Mots de passe de téléchargement transmis dans le corps de requêtes `POST`, et non dans l'URL.
- Limite de 1 Gio et blocage des extensions `.exe` et `.bat` côté front et côté back.
- Nom du fichier neutralisé contre l'injection CR/LF dans `Content-Disposition`.
- Réponses de téléchargement avec `Cache-Control: no-store`.
- Téléchargements transmis en streaming afin de ne pas charger entièrement les fichiers en mémoire.
- Seul `/actuator/health` est exposé ; les autres endpoints Actuator sont désactivés.
- Upload vers Supabase effectué avant l'enregistrement des métadonnées ; en cas d'échec de la base, le fichier Storage est supprimé par compensation.
- Message générique `Invalid credentials` utilisé lorsque le compte est absent ou que le mot de passe est incorrect.
- Suppression du filtre de journalisation des requêtes afin d'éviter l'enregistrement des corps, mots de passe, jetons et paramètres sensibles.
- Secrets injectés par variables d'environnement ; `.env` ne doit jamais être versionné.
- Erreurs inattendues transformées en message générique côté client.

## Constats et décisions

### Améliorations possibles

- Le JWT est stocké dans `localStorage`. Une protection contre les attaques XSS doit être maintenue. L'utilisation d'un cookie `HttpOnly` pourra être étudiée dans une future version.
- CORS devra être configuré avec l'adresse exacte du front-end lors du déploiement.
- La validation actuelle bloque les fichiers `.exe` et `.bat`. Une version de production pourrait aussi vérifier le contenu réel des fichiers et utiliser un antivirus.
- Une limitation du nombre de tentatives pourrait être ajoutée aux endpoints de connexion, d'upload et de téléchargement public.

## Politique des secrets

`DB_PASSWORD`, `JWT_SECRET` et `SUPABASE_SECRET_KEY` doivent être stockés dans le gestionnaire de secrets de l'environnement. Le JWT secret doit être aléatoire, suffisamment long pour l'algorithme HMAC, encodé en Base64 et différent par environnement. Rotation immédiate après fuite suspectée, départ d'un collaborateur ou exposition accidentelle dans Git/logs ; rotation planifiée au minimum tous les 90 jours pour les clés sensibles.

## Critères de sécurité avant production

- 0 vulnérabilité critique ou élevée non acceptée sur les dépendances livrées.
- Aucun mot de passe, JWT, jeton de partage ou secret dans les logs.
- Seul `/actuator/health` est public.
- Tests d'accès croisé entre deux utilisateurs, expiration et brute force du mot de passe de partage.
- Sauvegarde et restauration PostgreSQL vérifiées ; rotation des secrets documentée.
