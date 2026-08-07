# Modèle de données — la définition d'une tâche

Spec issue de la carte [Carte — Modèle de données : la définition d'une tâche](https://linear.app/points-rocket/issue/PIN-210/carte-modele-de-donnees-la-definition-dune-tache)
et de ses sept tickets. Elle est **suffisante pour écrire `server/database/schema.ts` et
la migration sans rouvrir de décision**. Chaque choix renvoie au ticket qui l'a tranché ;
ce document ne réexplique pas les raisonnements, il les applique.

> **Portée.** La **définition** d'une tâche uniquement. L'**instance** — complétion,
> réclamation, approbation, historique — et l'**économie** sont hors périmètre. Voir
> [Ce qui a été repoussé](#ce-qui-a-été-repoussé).

---

## 1. Vocabulaire

Tranché par ce ticket. Le glossaire canonique vit dans [`CONTEXT.md`](../CONTEXT.md) ;
ce qui suit n'en est que la part qui touche le schéma.

| Concept | Mot français (interface) | Identifiant (code) |
| --- | --- | --- |
| Ce qu'un membre doit faire | **tâche** | `task` / `tasks` |
| Groupe ordonné de tâches, appartenant à un membre | **routine** | `routine` / `routines` |
| Ligne de texte cochable dans une tâche | **étape** | `step` / `steps` |
| Monnaie dépensable à la boutique | **point** | `points` |
| Monnaie de progression, non dépensable | **XP** | `xp` |

Trois règles s'appliquent partout — spec, code, interface :

**Les identifiants sont en anglais, l'interface en français.** Confirmé : `users`,
`pin_hash`, `created_at` sont déjà posés dans `server/database/schema.ts`.

**Les noms de tables sont au pluriel** — `users`, `routines`, `tasks`. `users` existe
déjà et est parti dans une migration ; le renommer coûterait une migration pour une
préférence esthétique. Les sept tickets ont écrit `routine` et `task` au singulier :
c'étaient des noms de travail, explicitement signalés comme tels par
[Sous-tâches : table ordonnée ou colonne JSON](https://linear.app/points-rocket/issue/PIN-212/sous-taches-table-ordonnee-ou-colonne-json).
**Cette spec les remplace.**

**« Tâche » n'est jamais employé nu.** Le mot désigne deux étendues différentes :

- la **table** `tasks` contient *toutes* les tâches ;
- la puce de filtre « Tâches » du tableau ne désigne que le sous-ensemble `routine_id IS NULL`.

Donc, dans la spec comme dans le code et les commentaires, toujours qualifier :

- **tâche de routine** — `routine_id` renseigné ;
- **tâche du tableau** — `routine_id` vide.

La puce de filtre reste étiquetée « Tâches » à l'écran : le contraste immédiat avec
« Routines » juste à côté la désambiguïse. Le mot « corvée » n'est **pas** introduit —
il n'apparaît nulle part dans le design (seul l'identifiant `chores` existe, dans le
code de la maquette), et il sonne plus punitif que « tâche » pour une application
destinée à des enfants de 3 et 10 ans.

### « points », et la collision avec « XP »

Le design écrivait « pièces » partout — « 8 pièces », « Pièces en circulation »,
« un bonus de 40 pièces », le libellé de la récompense sur l'écran de détail.
**Arbitrage de Jonathan : c'est « points » qui survit**, à l'écran comme en code
(`points`).

Le risque connu et accepté est la collision avec les XP, qui sont eux aussi
des « points » au sens courant. Il se répare par une règle d'écriture, pas par une
colonne :

> **On écrit toujours « XP ». Jamais « points d'expérience », jamais « points XP ».**

Ainsi « points » ne désigne qu'une seule chose dans tout le projet : la monnaie
dépensable. Les deux mots restent distincts à l'oral comme à l'écrit.

**Déviations du design que ça entraîne** — à ne pas prendre pour des oublis en
construisant les écrans :

| Design | Devient |
| --- | --- |
| `8 pièces` (file d'approbation) | `8 points` |
| `pièces` (libellé de récompense, écran de détail) | `points` |
| `Pièces en circulation` (santé, écran adulte) | `Points en circulation` |
| `un bonus de 40 pièces` (note d'objectif) | `un bonus de 40 points` |
| `20 p`, `40 p`, `60 p`, `120 p` (prix boutique) | **inchangés** — l'abréviation marche pour les deux mots |

---

## 2. Les tables

Conventions reprises telles quelles de `server/database/schema.ts` :

- id `text` en clé primaire + `crypto.randomUUID()` applicatif — SQLite n'a pas de type
  `uuid` natif ;
- noms de colonnes **épelés explicitement** (`text('title')`, `integer('created_at', …)`)
  même si `casing: 'snake_case'` est réglé dans `drizzle.config.ts` — c'est le style du
  fichier existant ;
- `created_at` / `updated_at` en `integer({ mode: 'timestamp' })`, défaut `sql\`(unixepoch())\`` ;
- toutes les clés étrangères en `on delete restrict` — aucune suppression dure nulle part.

### 2.1 `routines`

```ts
export const routines = sqliteTable(
  'routines',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // « Avant l'école », « Le matin ». Porte AUSSI le moment de la journée :
    // il n'existe aucune colonne timeOfDay (PIN-214).
    title: text('title').notNull(),

    // Seul et unique porteur du ciblage (PIN-216).
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Cadence. La tâche n'en porte aucune ; elle hérite (PIN-215).
    recurrence: text('recurrence', {
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    })
      .notNull()
      .default('daily'),

    // Date civile 'YYYY-MM-DD'. Phase de la règle ET premier jour d'existence.
    // Défaut applicatif : le jour courant DANS LE FUSEAU DU FOYER — surtout pas
    // sql`(date('now'))`, qui rend la date UTC et décalerait d'un jour toute
    // routine créée en soirée (PIN-215).
    anchorDate: text('anchor_date')
      .notNull()
      .$defaultFn(() => todayInHouseholdTz()),

    // Active ⇔ NULL. Pas de booléen : le timestamp sait dire ce qui était actif
    // à une date passée (PIN-213).
    archivedAt: integer('archived_at', { mode: 'timestamp' }),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('routines_owner_id_idx').on(t.ownerId)],
)
```

**Ce que `routines` ne porte pas, et pourquoi :**

| Absent | Raison | Ticket |
| --- | --- | --- |
| `created_by` | La routine a un **propriétaire**, pas un auteur. Qui l'a écrite n'a aucun consommateur — le fil d'activité ne montre pas la création d'une routine. | PIN-213 |
| `time_of_day` | Le **titre** porte le repère. Un champ dédié le stockerait deux fois, avec la garantie qu'ils divergent. | PIN-214 |
| `end_date` | Voir [§ 2.3](#23-la-routine-na-pas-de-fin). | ce ticket |
| `position` | Rien dans le design ne montre un parent qui réordonne ses routines. L'ordre d'affichage se dérive de `created_at`. | — |
| XP / points | Une routine ne paie rien : elle est réputée faite quand ses tâches le sont. | PIN-211 |
| `estimated_minutes` | Pas de durée propre, même raison. | PIN-214 |
| `steps` | Les étapes vivent sur la tâche. | PIN-212 |

### 2.2 `tasks`

```ts
export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    title: text('title').notNull(),

    // Lue en direct par l'écran de détail. Nullable : la plupart des tâches de
    // routine (« Faire son lit ») n'en ont pas.
    description: text('description'),

    // LE DISCRIMINANT (PIN-211).
    //   renseigné → tâche de routine : non réclamable, absente du tableau ;
    //   vide      → tâche du tableau : réclamable, ouverte à tous.
    // Aucune colonne `type` : les deux filtres du tableau s'en dérivent.
    routineId: text('routine_id').references(() => routines.id, {
      onDelete: 'restrict',
    }),

    // Ordre des tâches DANS une routine. Entiers denses (0,1,2), réécrits en bloc
    // au réordonnancement. Pas d'unicité sur (routine_id, position) : SQLite n'a
    // pas d'unique différé, la contrainte exploserait en pleine réécriture.
    // Sans signification pour une tâche du tableau (PIN-212).
    position: integer('position').notNull().default(0),

    // Récompense. Deux valeurs INDÉPENDANTES — ni l'une ni l'autre n'est dérivée.
    // notNull SANS défaut : une tâche qui ne paie rien est une erreur de saisie,
    // pas un cas par défaut. Un formulaire ou un seed qui oublie le champ doit
    // échouer bruyamment plutôt que créer une tâche à 0.
    xp: integer('xp').notNull(),
    points: integer('points').notNull(),

    // Tableau de chaînes. L'ordre est l'ordre du tableau : aucune colonne de
    // position, aucune identité par étape — les coches sont éphémères (PIN-212).
    // .default(sql`'[]'`) et non .default([]) : la forme SQL brute est sans
    // ambiguïté sur une colonne text({ mode: 'json' }).
    steps: text('steps', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),

    // Minutes entières, purement informatif. Nullable : les tâches de routine
    // n'en portent pas dans le design. Aucune contrainte « multiple de 5 ».
    // NE PAS INDEXER — rien ne trie, ne filtre ni n'agrège dessus (PIN-214).
    estimatedMinutes: integer('estimated_minutes'),

    // Booléen d'ÉPUISEMENT, pas une cadence (PIN-215).
    //   false (défaut) → offre permanente, réclamable autant de fois qu'elle se présente
    //   true           → une fois faite, la définition quitte le tableau pour de bon
    // ⚠️ N'a de sens que si routineId est vide. Pour une tâche de routine, elle est
    // IGNORÉE : la vie de la tâche est réglée par sa routine. État représentable-
    // mais-vide-de-sens assumé, au même grain que le reste du discriminant.
    oneTime: integer('one_time', { mode: 'boolean' })
      .notNull()
      .default(false),

    archivedAt: integer('archived_at', { mode: 'timestamp' }),

    // Seule source de la ligne de fil « Mylène a ajouté "Arroser les plantes" au
    // tableau ». notNull : le seed pré-vieilli attribue ses définitions à un adulte
    // comme n'importe quelle création, donc pas de branche « si nul » à l'affichage.
    // Conséquence assumée : empêchera de retirer un membre ayant créé une tâche.
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('tasks_routine_id_idx').on(t.routineId)],
)
```

**Ce que `tasks` ne porte pas, et pourquoi :**

| Absent | Raison | Ticket |
| --- | --- | --- |
| tout champ de ciblage | La routine est le mécanisme nominatif, le tableau le mécanisme ouvert. Une tâche de routine hérite du propriétaire de sa routine ; une tâche du tableau n'appartient à personne. | PIN-216 |
| `participants_required` | Coupé. Toute la mécanique multi-assignation vit côté instance. | PIN-216 |
| `location` / table de pièces | « Ça n'a pas rapport ». Le lieu n'apparaît même pas sur l'écran de détail, et aucun filtre ne s'en sert. | PIN-214 |
| `requires_photo` | La preuve photo sort entièrement de la V1 : aucune mécanique d'approbation ne la consomme. | PIN-214 |
| `adults_only` / table d'éligibilité | `users` n'a pas de rôle : rien ne peut dire qui est adulte. Le garde-fou en V1 est social. | PIN-216 |
| `target_count` / `target_started_at` / `target_reward` | **Conçues mais pas écrites.** Inertes tant que la complétion n'existe pas. | PIN-218 |
| `recurrence` / date | Aucune cadence sur la tâche. Une tâche à cadence propre est le signal qu'il faut une deuxième routine. | PIN-215 |
| unicité de titre | Deux « Ranger sa chambre » — une pour Léo, une pour Jules — sont le cas normal, pas l'accident. | PIN-213 |
| table de versions | L'édition **écrase en place**. Le versionnement est **écarté**, pas reporté. | PIN-213 |

### 2.3 La routine n'a pas de fin

[Récurrence](https://linear.app/points-rocket/issue/PIN-215/recurrence-la-definition-porte-t-elle-une-regle-de-repetition)
a donné à la routine un **début** explicite (`anchor_date`) et a légué la question
symétrique — « a-t-elle une fin, genre *jusqu'à la fin de l'année scolaire* ? » — à
[Cycle de vie](https://linear.app/points-rocket/issue/PIN-213/cycle-de-vie-archivage-ou-suppression-dune-definition),
qui était **déjà fermé**. Elle n'avait jamais été tranchée. Elle l'est ici :

> **Aucune colonne de fin. Une routine expirée *est* une routine archivée.**

`archived_at` exprime déjà « cette routine est terminée », et aucun écran du design ne
montre de fin programmée. Sans cron (décision #10), une `end_date` ne serait qu'un
prédicat paresseux de plus — sans consommateur. Le parent archive en juin.

Ajouter `end_date text` nullable le jour où quelqu'un le demande est une migration
**purement additive** : la dérivation gagne une borne haute (`si aujourdhui > end_date → faux`)
et rien d'existant ne bouge.

---

## 3. Les règles dérivées

Rien n'est matérialisé, tout se calcule à la lecture — décision #10.

### 3.1 Les deux filtres du tableau

| Filtre | Prédicat |
| --- | --- |
| Routines | `routine_id IS NOT NULL` |
| Tâches | `routine_id IS NULL` |

La puce « En équipe » **n'existe plus** (PIN-216), ni la bannière « Cette semaine,
ensemble » de l'accueil.

### 3.2 Est-ce actif ?

Une tâche est active si **sa propre colonne et celle de sa routine** sont nulles.
Archiver une routine n'écrit **qu'une seule ligne** — aucune cascade (PIN-213).

```sql
-- tâches du tableau actives
SELECT * FROM tasks WHERE routine_id IS NULL AND archived_at IS NULL;

-- tâches actives d'une routine active
SELECT t.* FROM tasks t
  JOIN routines r ON r.id = t.routine_id
 WHERE t.routine_id = ? AND t.archived_at IS NULL AND r.archived_at IS NULL
 ORDER BY t.position, t.id;   -- départage déterministe par id : position n'est pas unique
```

*Ce que l'absence de cascade achète* — « Nourrir le chat » est archivée à part en mars,
le chat étant mort ; en septembre Léo change d'école et « Avant l'école » est archivée
entière. Quand la routine revient, on retrouve exactement l'ensemble qu'on avait retiré :
le chat reste mort.

### 3.3 Cette routine sort-elle aujourd'hui ?

Fonction **pure** de (la ligne `routines`, la date civile du jour). Le passage d'une
journée ne crée aucune ligne : il change la valeur d'un argument.

```
estActiveAujourdhui(routine, aujourdhui):   // aujourdhui : 'YYYY-MM-DD' dans le fuseau du foyer
  si aujourdhui < routine.anchorDate → faux            // borne de début
  selon routine.recurrence:
    daily   → vrai
    weekly  → jourDeSemaine(aujourdhui) == jourDeSemaine(anchorDate)
    monthly → quantieme(aujourdhui) == min(quantieme(anchorDate),
                                           joursDansLeMois(aujourdhui))
    yearly  → mois(aujourdhui) == mois(anchorDate)
              && quantieme(aujourdhui) == min(quantieme(anchorDate),
                                              joursDansLeMois(aujourdhui))
```

Le `min(...)` est la règle du **rabattement** : une routine mensuelle ancrée un 31 sort
le 28 (ou 29) en février, le 30 en avril. Une routine annuelle ancrée le 29 février sort
le 28 les années non bissextiles. « Sauter » aurait voulu dire qu'elle ne sort que 7 fois
par an, en silence.

« Les routines de Léo aujourd'hui » est donc `SELECT * FROM routines WHERE owner_id = ?`
suivi du filtre en mémoire. Un foyer a des dizaines de routines, pas des milliers.

> ⚠️ **Effet de bord du calcul paresseux** (PIN-218) : modifier `recurrence` ou
> `anchor_date` change **rétroactivement** quels jours passés étaient actifs, puisque
> rien n'est matérialisé. L'historique chiffré est à l'abri — les complétions recopient
> leurs valeurs (PIN-213) — mais tout ce qui se **recompte** à la lecture (progression
> d'objectif, série) se recalculera contre la nouvelle règle. À traiter quand la
> progression sera conçue.

### 3.4 Index

Deux, et deux seulement :

| Index | Sur | Requête servie |
| --- | --- | --- |
| `routines_owner_id_idx` | `routines.owner_id` | « les routines de Léo » |
| `tasks_routine_id_idx` | `tasks.routine_id` | les tâches d'une routine ; le tableau (`IS NULL`) |

**Ne pas indexer** `archived_at`, `estimated_minutes`, `position`, `xp`, `points`.
À l'échelle d'un foyer, ces deux index relèvent de la convention sur clés étrangères,
pas de la performance : SQLite balaie quelques dizaines de lignes plus vite qu'il ne
consulte un index.

---

## 4. Jeu d'exemple

Ids raccourcis pour la lisibilité ; en vrai ce sont des UUID. Membres repris du design :
`u_leo`, `u_jules`, `u_mylene`, `u_jonathan`.

### `routines`

| id | title | owner_id | recurrence | anchor_date | archived_at |
| --- | --- | --- | --- | --- | --- |
| `rt_leo_ecole` | Avant l'école | `u_leo` | `daily` | `2026-08-01` | `NULL` |

### `tasks` — les trois tâches de la routine

| id | title | routine_id | position | xp | points | steps | estimated_minutes | one_time | created_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tk_lit` | Faire son lit | `rt_leo_ecole` | 0 | 10 | 5 | `[]` | `NULL` | 0 | `u_mylene` |
| `tk_dents` | Se brosser les dents | `rt_leo_ecole` | 1 | 10 | 5 | `[]` | `NULL` | 0 | `u_mylene` |
| `tk_chat` | Nourrir le chat | `rt_leo_ecole` | 2 | 10 | 5 | `[]` | `NULL` | 0 | `u_mylene` |

### `tasks` — la tâche du tableau, avec ses trois étapes

| colonne | valeur |
| --- | --- |
| `id` | `tk_lave_vaisselle` |
| `title` | `Vider le lave-vaisselle` |
| `description` | `La vaisselle propre est rangée, la sale entre. Les verres sur la tablette du haut, s'il te plaît.` |
| `routine_id` | `NULL` ← **tâche du tableau** |
| `position` | `0` ← sans signification ici |
| `xp` | `25` |
| `points` | `8` |
| `steps` | `["Tablette du haut : verres et tasses","Tiroir à ustensiles","Mettre la vaisselle sale"]` |
| `estimated_minutes` | `10` |
| `one_time` | `0` ← offre permanente |
| `archived_at` | `NULL` |
| `created_by` | `u_jonathan` |

**Ce que ce jeu démontre :**

- Les deux côtés du discriminant coexistent dans une seule table, sans colonne `type`.
- Une tâche du tableau porte des étapes, une description et une durée ; les tâches de
  routine n'en portent aucune — et c'est bien la **même** table.
- L'ordre de la routine est dans `position` ; l'ordre des étapes est l'ordre du tableau JSON.
- Le ciblage tient dans `routines.owner_id` : les trois tâches de `rt_leo_ecole` sont à
  Léo sans qu'aucune ne le dise, et `tk_lave_vaisselle` n'est à personne.
- L'unité affichée d'un futur objectif se dérive : `tk_lit` → « jours » (routine `daily`),
  `tk_lave_vaisselle` → « séances » (`routine_id` vide).

> Les valeurs `points` des tâches de routine (5) sont des **exemples**, pas des données
> du design : le design n'affiche aucun point sur les routines. La carte a explicitement
> corrigé cette simplification — une tâche de routine paie XP **et** points (PIN-211).
> Deux incohérences du design à ne pas sur-interpréter au moment de rédiger le seed :
> l'aspirateur vaut 12 points dans `chores` mais 8 dans la file d'approbation, et
> « Lire 20 pages » vaut 15 XP alors que toutes les routines valent 10.

---

## 5. Prérequis d'implémentation

Trois choses à régler **avant ou pendant** l'écriture du schéma. Aucune n'est une
décision — ce sont des trous constatés dans l'état actuel du repo.

### 5.1 `todayInHouseholdTz()` n'existe pas encore

`anchor_date` en dépend pour son défaut applicatif. La constante de fuseau a été livrée
par PIN-215 — `runtimeConfig.public.timezone`, défaut `America/Montreal`, surchargeable
par `NUXT_PUBLIC_TIMEZONE` — mais le commit
[`5def1da`](https://github.com/chartie4r/HomeQuest/commit/5def1da) dort toujours sur la
branche `worktree-pin-215-fuseau-horaire` : **il n'est pas dans `main`**.

À faire : fusionner cette branche, puis écrire l'utilitaire. Et ajouter à la main
`NUXT_PUBLIC_TIMEZONE="America/Montreal"` dans `.env.example` — `Edit(**/.env*)` est
refusé par `.claude/settings.json`, donc aucun agent ne peut le faire.

> La dérivation de § 3.3 n'est juste que si **toute** comparaison de date passe par ce
> fuseau. `sql\`(date('now'))\`` rendrait la date UTC et décalerait d'un jour toute
> routine créée en soirée.

### 5.2 Les clés étrangères sont-elles seulement appliquées ?

`users` n'a **aucune** clé étrangère aujourd'hui : cette spec introduit les cinq
premières du schéma. Or `server/database/client.ts:21` ouvre la connexion sans rien
configurer :

```ts
return drizzle(createClient({ url }), { schema, casing: 'snake_case' })
```

SQLite n'applique les clés étrangères que si `PRAGMA foreign_keys = ON` est réglé
**par connexion**. À vérifier sur `@libsql/client` 0.17 avant de compter sur
`on delete restrict` : si le pragma n'est pas actif par défaut, tous les `restrict` de
cette spec sont décoratifs. Un simple `INSERT` avec un `owner_id` inexistant, suivi d'un
`SELECT`, tranche la question en trente secondes.

### 5.3 Normalisation des étapes à l'écriture

SQLite ne contraint rien dans une colonne JSON : `steps` accepterait `'{"oups":1}'` et
`$type<string[]>()` ne serait qu'un mensonge poli de TypeScript. Aucune bibliothèque de
validation n'est installée (ni `zod`, ni `valibot`), et en installer une pour cette seule
colonne serait disproportionné. Donc une petite fonction côté serveur, avant l'insert :

- `trim` chaque ligne, retirer les vides ;
- refuser au-delà de **10 étapes** et de **120 caractères** par libellé.

Garde-fous de saisie, pas règles métier — aucune ne mérite d'être dans le schéma. À
remplacer par un vrai schéma de validation le jour où une bibliothèque entre pour
d'autres raisons.

---

## 6. Ce qui a été repoussé

La liste explicite de ce que cette carte n'a **pas** tranché, pour que la conception de
l'instance sache où elle met les pieds.

### 6.1 Légué à la carte de l'instance — ne pas rouvrir

Trois contraintes qui découlent de « l'édition n'est pas rétroactive » (PIN-213) :

1. La complétion **recopie** XP et points au moment de la validation — elle ne les
   référence pas. Baisser « Vider le lave-vaisselle » de 25 à 15 XP ne touche pas les
   complétions passées.
2. Elle **référence** la définition pour le texte affiché — donc une clé étrangère, en
   `on delete restrict`. Corriger « lave-vaiselle » corrige partout, y compris dans
   l'historique.
3. Par conséquent la ligne de définition doit survivre à son retrait : c'est ce qui
   interdit la suppression dure, pas une préférence de style.

### 6.2 Conçu mais pas écrit — l'objectif à compteur

Trois colonnes nullable sur `tasks`, **absentes de cette spec** (PIN-218) :

| colonne | type | rôle |
| --- | --- | --- |
| `target_count` | `integer` nullable | la cible : 14, 5. Null = pas d'objectif |
| `target_started_at` | `integer({ mode: 'timestamp' })` nullable | l'ancre : seules les complétions postérieures comptent |
| `target_reward` | `text` nullable | le **prix seul** — « la sortie à la librairie de BD » |

Le compteur compte **toujours des complétions** (1 jour = 1 complétion) ; l'unité
affichée se dérive et ne se stocke pas :

```
uniteAffichee(task):
  si task.routineId est vide  → « séances »   // tâche du tableau : jamais quotidienne
  sinon                       → routine.recurrence == 'daily' ? « jours » : « séances »
```

Elles sont inertes tant que la complétion n'existe pas. **Et une question reste ouverte
avant de les écrire** : une cible posée sur une tâche du tableau n'a aucun porteur — la
tâche est ouverte à tous, donc le compteur ne compte pour personne. Trois issues
possibles, aucune tranchée : restreindre `target_count` aux tâches de routine ; ajouter
un `target_owner_id` ; ou compter par membre côté complétion. À trancher avec la carte
qui conçoit la progression, qui est aussi celle qui saura compter.

### 6.3 Hors périmètre de la carte

- L'**instance** et tout ce qui en découle : complétion, réclamation (« Libre » / « Pris
  par Léo »), file d'approbation, auto-approbation après 12 h, « Les dernières fois ».
- L'**économie** : grand livre des points, solde, boutique, achats.
- La **progression** : courbes d'XP, niveaux, séries, niveau de la maison, paliers de la
  ville, classement, fil d'activité, indicateurs de santé.
- La **preuve photo**, entièrement — ni exigée par la définition, ni attachée à l'instance.
- Les « **Modèles** » du design : ni bibliothèque du foyer, ni catalogue de départ.
- Le **rôle adulte/enfant** sur `users` — c'est le modèle des membres.
- La **multi-assignation** dans son ensemble.
- Le comportement du FK `routines.owner_id` **à la disparition d'un membre** : la
  suppression d'un membre n'est modélisée nulle part. `on delete restrict` s'applique par
  défaut, mais la vraie décision appartient au modèle des membres.

### 6.4 Explicitement hors v1, côté récurrence

- Pas d'**intervalle** (« toutes les 2 semaines ») : `recurrence` est une énumération de
  quatre valeurs. L'ajout de `interval integer notNull default 1` serait purement additif.
- Pas d'**hebdomadaire multi-jours** (« lundi et mercredi ») : deux routines l'expriment
  sans mentir au modèle.
- Pas de **cadence par tâche** : la tâche hérite de sa routine, sans exception.
- Pas de **date sur une tâche du tableau**. « Tâche datée » ressortira à la conception de
  l'instance.
