# Performance — DataShare

Mesures effectuées les **13 et 18 octobre 2026** sur un Mac local, avec Java 21, Spring Boot 3.5.5 et le PostgreSQL Supabase configuré. Ces chiffres constituent une référence locale, pas un engagement de production.

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

| Endpoint/scénario                  |             Budget p95 | Taux d'erreur | Remarque                                        |
| ---------------------------------- | ---------------------: | ------------: | ----------------------------------------------- |
| `GET /actuator/health` chaud       |               < 150 ms |       < 0,1 % | budget respecté par la mesure locale            |
| `POST /api/login`                  |               < 500 ms |         < 1 % | BCrypt rend volontairement l'opération coûteuse |
| `GET /api/files` pour 100 fichiers |               < 500 ms |         < 1 % | ajouter pagination au-delà de 100               |
| Upload hors transfert du contenu   |                  < 1 s |         < 1 % | mesurer séparément le débit réseau/Storage      |
| Téléchargement                     | début de réponse < 1 s |         < 1 % | streaming requis pour les fichiers volumineux   |

Une campagne représentative doit compléter cette base avec k6/JMeter : montée progressive 1, 10 puis 25 utilisateurs, fichiers de 1 Mio/100 Mio/1 Gio, Supabase réel, p50/p95/p99, CPU, mémoire, connexions JDBC et taux d'erreur.

## Build et budget front-end

Commande :

```bash
cd front_end
npm run build -- --no-progress
```

### Mesure avant optimisation

```text
main.js                 648.20 kB brut / 136.13 kB estimés transférés
polyfills.js             34.58 kB brut /  11.32 kB estimés transférés
styles.css                7.09 kB brut /   1.19 kB estimés transférés
initial total           689.87 kB brut / 148.64 kB estimés transférés
génération               1.689 s
```

Le bundle initial brut dépassait de **189,87 kB** le seuil d'avertissement de
500 kB.

### Mesure après optimisation

```text
chunk principal partagé   225,81 kB brut / 61,86 kB estimés transférés
main.js                      4,01 kB brut /  1,49 kB estimés transférés
polyfills.js                34,58 kB brut / 11,32 kB estimés transférés
styles.css                   0,19 kB brut /  0,19 kB estimés transférés
initial total              265,08 kB brut / 75,35 kB estimés transférés
génération                  1,193 s
```

### Comparaison

| Mesure                    |     Avant |     Après |            Évolution |
| ------------------------- | --------: | --------: | -------------------: |
| Bundle initial brut       | 689,87 kB | 265,08 kB | -424,79 kB (-61,6 %) |
| Taille transférée estimée | 148,64 kB |  75,35 kB |  -73,29 kB (-49,3 %) |
| Temps de génération       |   1,689 s |   1,193 s |   -0,496 s (-29,4 %) |

Le lazy loading des pages a séparé leur code du chargement initial et Angular
Material, qui n'était pas utilisé, a été retiré. Le bundle initial respecte
désormais le seuil d'avertissement de 500 kB avec une marge de 234,92 kB.

Budget retenu :

| Ressource/métrique  | Avertissement | Échec CI cible |
| ------------------- | ------------: | -------------: |
| Bundle initial brut |        500 kB |         750 kB |
| CSS d'un composant  |          4 kB |           8 kB |
| LCP mobile          |         2,5 s |            4 s |
| INP                 |        200 ms |         500 ms |
| CLS                 |          0,10 |           0,25 |

Une mesure Lighthouse mobile sur le build de production a donné un LCP de
**3,6 s** et un CLS de **0**. Une interaction automatisée sur le bouton
d'upload a produit une latence d'environ **16 ms**, utilisée comme approximation
de laboratoire de l'INP. Le LCP respecte le seuil d'échec de 4 s, mais reste
supérieur à l'objectif de 2,5 s. Le CLS et la latence d'interaction respectent
les budgets définis.

## Interprétation et actions

Les corrections suivantes ont été réalisées :

1. Les routes Angular utilisent désormais `loadComponent`, ce qui charge les
   pages à la demande et réduit le bundle initial.
2. Angular Material et son thème global ont été retirés, car ils n'étaient pas
   utilisés par l'application.
3. Les téléchargements du back-end utilisent `StreamingResponseBody` afin de
   ne plus charger l'intégralité des fichiers en mémoire.
4. Le bundle initial est passé de 689,87 kB à 265,08 kB et respecte maintenant
   le budget de 500 kB.

Les optimisations suivantes restent à réaliser :

1. Optimiser ou remplacer `Shape.svg`, qui pèse encore environ 673 kB, afin
   d'améliorer le LCP mobile.
2. Factoriser les styles responsive communs afin de réduire les CSS propres à
   chaque composant.
3. Paginer `/api/files` lorsque l'historique contient un grand nombre de
   fichiers et vérifier les index sur `user_id`, `expires_at` et
   `download_token_hash`.
4. Compléter les mesures avec un test de charge des endpoints métier :
   connexion, liste des fichiers, upload et téléchargement.
