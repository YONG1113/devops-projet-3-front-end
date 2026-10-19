# Performance — DataShare

Mesures effectuées les **13, 18 et 19 octobre 2026** sur un Mac local, avec Java 21, Spring Boot 3.5.5 et le PostgreSQL Supabase configuré. Ces chiffres constituent une référence locale, pas un engagement de production.

## Test de charge des fonctionnalités métier

Le test de charge a été réalisé avec k6 sur les fonctionnalités de connexion,
consultation des fichiers, upload, téléchargement et suppression. La charge est
montée progressivement jusqu'à cinq utilisateurs virtuels utilisant un même
compte de test. Chaque itération a envoyé un petit fichier texte, puis l'a
supprimé avec l'API applicative.

### Conditions du test

```text
Montée en charge             : 10 s jusqu'à 2 utilisateurs virtuels
Charge principale           : 30 s jusqu'à 5 utilisateurs virtuels
Descente en charge          : 10 s
Utilisateurs virtuels max.  : 5
Stockage                    : Supabase Storage
Base de données             : PostgreSQL Supabase
```

### Résultats

| Fonctionnalité        | Temps moyen |   Médiane |       p90 |       p95 |   Maximum |
| --------------------- | ----------: | --------: | --------: | --------: | --------: |
| Connexion             |   145,61 ms | 133,89 ms | 198,84 ms | 206,63 ms | 231,02 ms |
| Liste des fichiers    |    54,94 ms |  44,94 ms | 109,87 ms | 126,71 ms | 137,44 ms |
| Upload                |   216,65 ms | 207,51 ms | 271,52 ms | 278,37 ms | 541,79 ms |
| Téléchargement        |   240,57 ms | 227,24 ms | 334,38 ms | 381,28 ms | 492,29 ms |
| Suppression           |   192,84 ms | 171,59 ms | 245,50 ms | 261,39 ms | 551,49 ms |
| Ensemble des requêtes |   169,80 ms | 167,06 ms | 268,51 ms | 306,78 ms | 541,79 ms |

### Synthèse

```text
Utilisateurs virtuels maximum : 5
Itérations terminées          : 73
Requêtes HTTP                 : 365
Débit moyen                   : 7,17 requêtes/s
Vérifications réussies        : 438/438
Taux d'erreur HTTP            : 0 %
```

### Budgets et interprétation

| Fonctionnalité     | Budget p95 | p95 mesuré | Taux d'erreur cible | Résultat |
| ------------------ | ---------: | ---------: | ------------------: | -------- |
| Connexion          |   < 500 ms |  206,63 ms |               < 1 % | Conforme |
| Liste des fichiers |   < 500 ms |  126,71 ms |               < 1 % | Conforme |
| Upload             |      < 2 s |  278,37 ms |               < 1 % | Conforme |
| Téléchargement     |      < 2 s |  381,28 ms |               < 1 % | Conforme |
| Suppression        |   < 500 ms |  261,39 ms |               < 1 % | Conforme |

Tous les budgets définis sont respectés et aucune erreur HTTP ou fonctionnelle
n'a été observée pendant les 73 itérations. Le téléchargement est l'opération
la plus lente au p95, mais reste largement sous le seuil de 2 secondes.

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
5. Un test de charge k6 couvre désormais la connexion, la liste des fichiers,
   l'upload, le téléchargement et la suppression, avec un taux d'erreur de 0 %.

Les optimisations suivantes restent à réaliser :

1. Optimiser ou remplacer `Shape.svg`, qui pèse encore environ 673 kB, afin
   d'améliorer le LCP mobile.
2. Factoriser les styles responsive communs afin de réduire les CSS propres à
   chaque composant.
3. Paginer `/api/files` lorsque l'historique contient un grand nombre de
   fichiers et vérifier les index sur `user_id`, `expires_at` et
   `download_token_hash`.
