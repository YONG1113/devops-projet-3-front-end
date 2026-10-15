# Performance — DataShare

Mesures effectuées le **13 octobre 2026** sur un Mac local, avec Java 21, Spring Boot 3.5.5 et le PostgreSQL Supabase configuré. Ces chiffres constituent une référence locale, pas un engagement de production.

## Test d'un endpoint serveur

Endpoint : `GET /actuator/health`. L'application a été lancée sur le port `18080`, puis testée avec ApacheBench :

```bash
ab -n 200 -c 10 http://127.0.0.1:18080/actuator/health
```

Résultats :

```text
Complete requests:      200
Failed requests:        0
Requests per second:    282.68
Time per request:       35.376 ms (concurrency 10)
Processing mean:        31 ms
p50:                    20 ms
p90:                    70 ms
p95:                    87 ms
p99:                    101 ms
maximum:                106 ms
```

La première requête à froid a pris environ 730 ms, notamment à cause de l'initialisation du DispatcherServlet et des contrôles de santé. Après échauffement, 100 % des requêtes ont réussi et le p95 reste inférieur à 100 ms. Ce test sollicite un endpoint léger ; il ne mesure ni upload, ni transfert Supabase, ni débit de gros fichiers.

## Budget serveur proposé

| Endpoint/scénario | Budget p95 | Taux d'erreur | Remarque |
| --- | ---: | ---: | --- |
| `GET /actuator/health` chaud | < 150 ms | < 0,1 % | budget respecté par la mesure locale |
| `POST /api/login` | < 500 ms | < 1 % | BCrypt rend volontairement l'opération coûteuse |
| `GET /api/files` pour 100 fichiers | < 500 ms | < 1 % | ajouter pagination au-delà de 100 |
| Upload hors transfert du contenu | < 1 s | < 1 % | mesurer séparément le débit réseau/Storage |
| Téléchargement | début de réponse < 1 s | < 1 % | streaming requis pour les fichiers volumineux |

Une campagne représentative doit compléter cette base avec k6/JMeter : montée progressive 1, 10 puis 25 utilisateurs, fichiers de 1 Mio/100 Mio/1 Gio, Supabase réel, p50/p95/p99, CPU, mémoire, connexions JDBC et taux d'erreur.

## Build et budget front-end

Commande :

```bash
cd front_end
npm run build -- --no-progress
```

Mesures du build de production :

```text
main.js                 648.20 kB brut / 136.13 kB estimés transférés
polyfills.js             34.58 kB brut /  11.32 kB estimés transférés
styles.css                7.09 kB brut /   1.19 kB estimés transférés
initial total           689.87 kB brut / 148.64 kB estimés transférés
génération               1.689 s
```

Le build réussit mais dépasse de **189,87 kB** le seuil d'avertissement initial de 500 kB. Deux styles dépassent aussi le seuil de 4 kB : upload à 4,60 kB et compte à 6,43 kB. Le seuil d'erreur initial de 1 Mio et le seuil d'erreur de 8 kB par composant restent respectés.

Budget retenu :

| Ressource/métrique | Avertissement | Échec CI cible |
| --- | ---: | ---: |
| Bundle initial brut | 500 kB | 1 Mio actuellement, à réduire ensuite à 750 kB |
| CSS d'un composant | 4 kB | 8 kB |
| LCP mobile | 2,5 s | 4 s |
| INP | 200 ms | 500 ms |
| CLS | 0,10 | 0,25 |

LCP, INP et CLS n'ont pas été mesurés dans cette campagne. Ils doivent être capturés avec Lighthouse sur un build servi en mode production, avec profil mobile et réseau simulé.

## Interprétation et actions

1. Ajouter du lazy loading pour les routes compte, upload et download afin de réduire le bundle initial.
2. Vérifier si Angular Material est nécessaire partout et importer uniquement les éléments utilisés.
3. Optimiser `Shape.svg` (environ 673 kB) et `Frame18.svg` (environ 18 kB) ; le premier asset est plus gros que le bundle JavaScript principal.
4. Factoriser les styles responsive communs pour réduire les CSS des composants.
5. Remplacer les téléchargements en `byte[]` par du streaming : un fichier de 1 Gio peut sinon consommer au moins 1 Gio de heap par requête.
6. Paginer `/api/files` et indexer les colonnes de recherche (`user_id`, `expires_at`, `download_token_hash`).
7. Réduire le logging DEBUG pendant les tests de charge, car il modifie fortement les résultats et génère beaucoup d'I/O.

