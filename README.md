# Gestion des inscriptions de raid de guilde

API back-end permettant de gérer les membres d'une guilde, leurs personnages, les raids et les inscriptions aux raids.

Les données sont stockées en mémoire et sont réinitialisées à chaque redémarrage de l'application.

## Fonctionnalités

* Gestion des membres de la guilde
* Gestion des personnages
* Création et gestion des raids
* Inscription des personnages aux raids
* Gestion des statuts d'inscription
* Gestion automatique de la liste d'attente
* API REST avec échanges en JSON

## Règles de gestion

* Un raid possède un nombre maximum de joueurs.
* Un raid peut avoir trois états : `open`, `closed` ou `done`.
* Une inscription est possible uniquement sur un raid `open`.
* Un personnage possède un rôle : `tank`, `healer` ou `dps`.
* Un personnage ne peut être inscrit qu'une seule fois à un même raid.
* Si un raid est complet, les nouvelles inscriptions passent en `waitlist`.
* Lorsqu'une place se libère, la première inscription de la liste d'attente passe en `pending`.
* Une inscription peut avoir les statuts suivants :

  * `pending`
  * `accepted`
  * `refused`
  * `waitlist`

## Entités

### Member

| Champ    | Type   | Description             |
| -------- | ------ | ----------------------- |
| `id`     | number | Identifiant unique      |
| `pseudo` | string | Pseudo unique du membre |

### Character

| Champ      | Type   | Description                        |
| ---------- | ------ | ---------------------------------- |
| `id`       | number | Identifiant unique                 |
| `memberId` | number | Identifiant du membre propriétaire |
| `name`     | string | Nom du personnage                  |
| `classe`   | string | Classe du personnage               |
| `role`     | string | `tank`, `healer` ou `dps`          |

### Raid

| Champ         | Type     | Description                |
| ------------- | -------- | -------------------------- |
| `id`          | number   | Identifiant unique         |
| `title`       | string   | Titre du raid              |
| `description` | string   | Description facultative    |
| `date`        | ISO date | Date et heure du raid      |
| `maxPlayers`  | number   | Nombre maximum de joueurs  |
| `status`      | string   | `open`, `closed` ou `done` |

### Registration

| Champ         | Type     | Description                                    |
| ------------- | -------- | ---------------------------------------------- |
| `id`          | number   | Identifiant unique                             |
| `raidId`      | number   | Identifiant du raid                            |
| `characterId` | number   | Identifiant du personnage                      |
| `role`        | string   | `tank`, `healer` ou `dps`                      |
| `status`      | string   | `pending`, `accepted`, `refused` ou `waitlist` |
| `createdAt`   | ISO date | Date de création de l'inscription              |

## Routes

### Members

| Méthode | Route          | Description         |
| ------- | -------------- | ------------------- |
| GET     | `/members`     | Liste des membres   |
| GET     | `/members/:id` | Détail d'un membre  |
| POST    | `/members`     | Créer un membre     |
| PUT     | `/members/:id` | Remplacer un membre |
| PATCH   | `/members/:id` | Modifier un membre  |
| DELETE  | `/members/:id` | Supprimer un membre |

### Characters

| Méthode | Route             | Description             |
| ------- | ----------------- | ----------------------- |
| GET     | `/characters`     | Liste des personnages   |
| GET     | `/characters/:id` | Détail d'un personnage  |
| POST    | `/characters`     | Créer un personnage     |
| PUT     | `/characters/:id` | Remplacer un personnage |
| PATCH   | `/characters/:id` | Modifier un personnage  |
| DELETE  | `/characters/:id` | Supprimer un personnage |

Filtre disponible :

```text
GET /characters?memberId=:memberId
```

### Raids

| Méthode | Route        | Description       |
| ------- | ------------ | ----------------- |
| GET     | `/raids`     | Liste des raids   |
| GET     | `/raids/:id` | Détail d'un raid  |
| POST    | `/raids`     | Créer un raid     |
| PUT     | `/raids/:id` | Remplacer un raid |
| PATCH   | `/raids/:id` | Modifier un raid  |
| DELETE  | `/raids/:id` | Supprimer un raid |

### Registrations

| Méthode | Route                | Description                      |
| ------- | -------------------- | -------------------------------- |
| GET     | `/registrations`     | Liste des inscriptions           |
| GET     | `/registrations/:id` | Détail d'une inscription         |
| POST    | `/registrations`     | Inscrire un personnage à un raid |
| PUT     | `/registrations/:id` | Remplacer une inscription        |
| PATCH   | `/registrations/:id` | Modifier une inscription         |
| DELETE  | `/registrations/:id` | Annuler une inscription          |

Filtre disponible :

```text
GET /registrations?raidId=:raidId
```

## Codes HTTP

| Code  | Signification                   |
| ----- | ------------------------------- |
| `200` | Succès                          |
| `201` | Ressource créée                 |
| `204` | Suppression réussie             |
| `400` | Données invalides ou manquantes |
| `404` | Ressource introuvable           |
| `409` | Conflit                         |

Les conflits `409` peuvent notamment correspondre à un pseudo déjà utilisé, un raid complet ou fermé, ou une inscription en doublon.

## Stack technique

* JavaScript
* Node.js
* Modules ES
* Express 5
* JSON
* Stockage en mémoire
* Port `5000`

## Structure du projet

```text
src/
├── index.js
├── router/
│   ├── member.router.js
│   ├── character.router.js
│   ├── raid.router.js
│   └── registration.router.js
├── data/
└── services/
```

* `src/index.js` : point d'entrée, branchement des routeurs et gestion des erreurs.
* `src/router/` : routes de chaque entité.
* `src/data/` : stockage des données en mémoire.
* `src/services/` : règles de gestion, notamment les places disponibles et la liste d'attente.

## État du projet

### Terminé

* Analyse et définition des entités
* Définition des routes de base

### À faire

* Implémentation des routes
* Gestion des places disponibles
* Gestion de la liste d'attente
