# Tests de charge DataShare

Ce dossier contient le scénario k6 couvrant les fonctionnalités métier du
back-end : connexion, liste des fichiers, upload, téléchargement et nettoyage.

## Prérequis

- le back-end est démarré sur le port `8080` ;
- k6 est installé;
- un compte de test existe déjà dans l'application ;
- les variables `PERF_LOGIN` et `PERF_PASSWORD` correspondent à ce compte.

Les cinq utilisateurs virtuels utilisent le même compte de test. Chaque
fichier possède un nom commençant par `perf-test-` et un chemin Storage unique.

## Exécution

Depuis le répertoire `front_end` :

```bash
BASE_URL='http://localhost:8080' \
PERF_LOGIN='compte-test@datashare.fr' \
PERF_PASSWORD='mot-de-passe-test' \
k6 run \
  --summary-export=performance/results/summary.json \
  performance/k6/file-lifecycle.js
```

Le scénario monte progressivement jusqu'à cinq utilisateurs virtuels. Chaque
itération se connecte, consulte la liste des fichiers, envoie un petit fichier,
le télécharge, puis appelle l'API de suppression.

## Nettoyage

Après chaque upload réussi, le scénario tente toujours de supprimer le fichier,
même lorsque le téléchargement échoue. Une interruption brutale de k6 ou une
erreur de suppression peut néanmoins laisser un fichier dans le compte de test.

Après l'exécution, vérifier dans l'historique du compte qu'aucun fichier dont le
nom commence par `perf-test-` ne subsiste. Les éventuels fichiers restants
doivent être supprimés avec l'API applicative afin de retirer à la fois l'objet
Supabase Storage et ses métadonnées.

## Résultats

Le résumé JSON est généré dans `performance/results/summary.json`.
