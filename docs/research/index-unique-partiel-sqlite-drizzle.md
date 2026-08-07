# Index unique partiel en SQLite et son expression en Drizzle

> Recherche PIN-222. Toutes les affirmations ci-dessous sont soit citées d'une source
> primaire (`sqlite.org`, code installé dans `node_modules`), soit **mesurées** contre
> les dépendances réellement installées dans ce repo. Les points que je n'ai pas pu
> établir sont listés en fin de document.

**Contexte du repo au moment de la mesure**

| Composant | Version | Comment obtenue |
|---|---|---|
| `@libsql/client` | 0.17.4 | `package.json` + `node_modules` |
| SQLite embarqué par libSQL | **3.45.1** (2024-01-30) | `select sqlite_version()` |
| `drizzle-orm` | 0.45.2 | `node_modules/drizzle-orm/package.json` |
| `drizzle-kit` | 0.31.10 | `node_modules/drizzle-kit/package.json` |
| SQLite amont de référence | 3.51.2 | `node:sqlite` de Node v24.14.0 |

---

## Les quatre réponses

**1. SQLite supporte-t-il `CREATE UNIQUE INDEX … WHERE …` ?**
Oui. Depuis **SQLite 3.8.0 (2013-08-26)** ; le client du repo embarque 3.45.1, très
au-delà. Le `WHERE` n'accepte que des opérateurs, des littéraux et des colonnes **de la
table indexée** ; sous-requêtes, colonnes d'autres tables, fonctions non déterministes et
paramètres liés sont rejetés. `WHERE col IS NOT NULL` est l'exemple canonique de la doc.

**2. Drizzle sait-il l'exprimer, et `drizzle-kit` émet-il le `WHERE` ?**
Oui aux deux. `uniqueIndex('nom').on(…).where(sql\`…\`)` existe bien en `drizzle-orm@0.45.2`
(la méthode `.where(condition: SQL)` est sur `IndexBuilder`), et `drizzle-kit@0.31.10`
émet correctement le `WHERE` dans le `.sql` **et** dans le snapshot JSON — vérifié en
générant réellement une migration. **Mais `drizzle-kit push` est cassé sur ce point** : il
ne relit jamais le prédicat depuis la base, donc il *drop + recrée* l'index à chaque
exécution, indéfiniment. Utiliser `db:generate` + migrations, jamais `db:push`.

**3. Plusieurs `NULL` dans une colonne d'index unique sont-ils distincts ?**
**Oui — c'est le point décisif.** SQLite considère chaque `NULL` comme différent de tout
autre `NULL`. Mesuré : trois lignes `('t1', NULL)` sont toutes acceptées par un
`UNIQUE INDEX (task_id, occurrence_date)` nu. Donc **un unique naïf sur
`(task_id, occurrence_date)` ne contraint absolument rien pour les tâches de tableau.**

**4. `@libsql/client` diverge-t-il de SQLite classique ?**
**Non, sur aucun des trois points.** Batterie de 23 tests jouée à l'identique sur libSQL
3.45.1 et SQLite amont 3.51.2 : comportement identique partout. Les 7 « divergences »
brutes sont uniquement cosmétiques (libSQL préfixe ses messages d'erreur par
`SQLITE_CONSTRAINT:` / `SQLITE_ERROR:`). Sur `PRAGMA foreign_keys`, la divergence signalée
précédemment est réelle mais c'est un choix **du wrapper**, pas du moteur — et
`node:sqlite` fait exactement pareil (voir mesure 6).

---

## Ce que ça implique pour la table des complétions

Un seul index ne suffit pas. Il en faut **deux**, parce que les deux populations de lignes
ont des règles d'unicité différentes :

```ts
import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const taskCompletions = sqliteTable(
  'task_completions',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    // NULL pour une tâche de tableau (pas d'occurrence datée)
    occurrenceDate: text('occurrence_date'),
  },
  (t) => [
    // Tâches récurrentes : une seule complétion par (tâche, occurrence).
    // Le WHERE n'est pas décoratif : sans lui l'index ne contraint pas les lignes NULL,
    // et avec lui il ne les indexe même pas (index plus compact, même sémantique).
    uniqueIndex('task_completions_occurrence_unique')
      .on(t.taskId, t.occurrenceDate)
      .where(sql`${t.occurrenceDate} is not null`),

    // Tâches de tableau : une seule complétion par tâche, tout court.
    // C'est CE second index qui rattrape le trou laissé par la sémantique des NULL.
    uniqueIndex('task_completions_board_unique')
      .on(t.taskId)
      .where(sql`${t.occurrenceDate} is null`),
  ],
)
```

Notes de mise en œuvre :

- Le 3e argument de `sqliteTable` doit retourner un **tableau** en 0.45.2 ; la forme objet
  est encore acceptée mais marquée `@deprecated` dans les types installés.
- Le second index encode une décision produit — « une tâche de tableau ne se complète
  qu'une fois ». Si le produit veut autoriser plusieurs complétions d'une tâche de
  tableau, il faut **omettre** ce second index, et alors aucune contrainte en base ne
  couvre ce cas (par construction, pas par oubli).
- Les deux index produisent des erreurs `SQLITE_CONSTRAINT` distinctes (`…task_id,
  …occurrence_date` vs `…task_id` seul), donc le code applicatif peut les distinguer.

---

## Les mesures

Toutes jouées sur des bases fichier jetables dans un dossier temporaire. `data/`,
`server/database/schema.ts` et les migrations existantes n'ont pas été touchés.

### Mesure 0 — quelle SQLite libSQL embarque-t-il vraiment

```js
const c = createClient({ url: 'file:./probe.db' })
await c.execute('select sqlite_version() as v, sqlite_source_id() as sid')
```

```
v   = 3.45.1
sid = 2024-01-30 16:01:20 e876e51a0ed5c5b3126f52e532044363a014bc594cfefa87ffb5b82257ccalt1
```

Le suffixe `alt1` (au lieu d'un hash SHA1 complet) est la marque du fork libSQL : ce n'est
pas un binaire SQLite amont, c'est la version modifiée par Turso. D'où l'intérêt de ne
rien présumer et de tout mesurer — ce que fait la mesure 5.

### Mesure 1 — l'index partiel se crée et mord

```sql
create table task_completions (id text primary key, task_id text not null, occurrence_date text);
create unique index tc_occ_unique on task_completions (task_id, occurrence_date)
  where occurrence_date is not null;
```

```
[OK]   CREATE UNIQUE INDEX ... WHERE occurrence_date IS NOT NULL -> index créé
[OK]   insert #1 (t1, 2026-08-04)                     -> accepté
[FAIL] insert #2 DOUBLON (t1, 2026-08-04)             -> SQLITE_CONSTRAINT: UNIQUE constraint
                                                          failed: task_completions.task_id,
                                                          task_completions.occurrence_date
[OK]   insert #3 (t1, 2026-08-05) date différente     -> accepté
```

### Mesure 2 — la sémantique des `NULL`, le point décisif

Sur ce même index partiel, les lignes à `occurrence_date NULL` ne sont pas indexées :

```
[OK] insert (t9, NULL) #1  -> accepté
[OK] insert (t9, NULL) #2  -> accepté
[OK] insert (t9, NULL) #3  -> accepté
lignes t9 : [ { n: 3 } ]
```

Et surtout, le même résultat avec un index unique **nu**, sans aucune clause `WHERE` :

```sql
create table plain (task_id text not null, occurrence_date text);
create unique index plain_u on plain (task_id, occurrence_date);
```

```
[OK]   ('t1', NULL) x3 sur index unique NU -> les 3 ACCEPTÉS
[FAIL] ('t1', 'x')  x2                     -> SQLITE_CONSTRAINT: UNIQUE constraint failed
```

C'est la démonstration directe du piège annoncé dans le ticket : **l'unique naïf marche
pour les occurrences datées et ne contraint rien pour les tâches de tableau.**

### Mesure 3 — le second index partiel rattrape le trou

```sql
create unique index tc_board_unique on task_completions (task_id)
  where occurrence_date is null;
```

```
[OK]   insert (t5, NULL) #1 -> accepté
[FAIL] insert (t5, NULL) #2 -> SQLITE_CONSTRAINT: UNIQUE constraint failed:
                                task_completions.task_id
```

### Mesure 4 — les restrictions réelles sur l'expression du `WHERE`

Dix expressions soumises à `CREATE UNIQUE INDEX … WHERE …` :

| Expression du `WHERE` | Résultat mesuré |
|---|---|
| `d is not null` | ACCEPTÉ |
| `d > '2020-01-01'` (littéral) | ACCEPTÉ |
| `length(d) > 3` (fonction déterministe) | ACCEPTÉ |
| `d is not null and b <> 'x'` (composé) | ACCEPTÉ |
| `case when d is null then 0 else 1 end = 1` | ACCEPTÉ |
| `coalesce(d,'') <> ''` | ACCEPTÉ |
| `random() > 0` | REJETÉ — `non-deterministic functions prohibited in partial index WHERE clauses` |
| `sqlite_version() > '3'` | REJETÉ — idem |
| `d in (select …)` (sous-requête) | REJETÉ — `subqueries prohibited in partial index WHERE clauses` |
| `plain.task_id is not null` (autre table) | REJETÉ — `no such column: plain.task_id` |
| `d > ?` (paramètre lié) | REJETÉ — `parameters prohibited in partial index WHERE clauses` |

Cela recoupe exactement la doc : opérateurs + littéraux + colonnes de la table indexée.

**Un écart doc/mesure à signaler.** `deterministic.html` classe `date('now')` comme non
déterministe, ce qui devrait l'exclure. En pratique il **passe** — sur les deux moteurs :

```
d > date('now')                    libSQL: ACCEPTÉ    amont: ACCEPTÉ
d > julianday('now')               libSQL: ACCEPTÉ    amont: ACCEPTÉ
d > datetime('now','localtime')    libSQL: ACCEPTÉ    amont: ACCEPTÉ
d > strftime('%Y','now')           libSQL: ACCEPTÉ    amont: ACCEPTÉ
d > current_timestamp              libSQL: REJETÉ     amont: REJETÉ
random() > 0        (témoin)       libSQL: REJETÉ     amont: REJETÉ
```

Seul le mot-clé `current_timestamp` est intercepté ; les fonctions date/heure passent au
travers du contrôle. C'est un piège à éviter — un prédicat d'index qui dépend de l'horloge
donne un index dont l'appartenance des lignes déjà écrites n'est jamais recalculée quand
le temps avance. **Pour notre cas ça n'a aucune incidence** (`IS NULL` / `IS NOT NULL` ne
touchent pas à l'horloge), mais il ne faut pas conclure de « ça a été accepté » que « c'est
supporté ». Je n'ai pas établi si SQLite considère cela comme un bug (voir *Non établi*).

### Mesure 5 — libSQL contre SQLite amont, batterie identique

Même suite de 23 tests jouée sur `@libsql/client` 0.17.4 (SQLite 3.45.1) et sur
`node:sqlite` de Node 24 (SQLite 3.51.2), en comparant les résultats deux à deux.

**Résultat : aucune divergence de comportement.** Les 7 lignes marquées différentes le sont
uniquement par le texte de l'erreur :

```
- insert doublon
    libSQL   : SQLITE_CONSTRAINT: UNIQUE constraint failed: t.task_id, t.occ
    amont    : UNIQUE constraint failed: t.task_id, t.occ
- WHERE sous-requête
    libSQL   : SQLITE_ERROR: subqueries prohibited in partial index WHERE clauses
    amont    : subqueries prohibited in partial index WHERE clauses
```

libSQL préfixe le code SQLite au message ; la sémantique est identique. Création d'index
partiels, unicité partielle, distinction des `NULL`, restrictions du `WHERE` : tout
concorde. Les autres pragmas testés (`recursive_triggers`, `journal_mode`,
`legacy_alter_table`, `defer_foreign_keys`) ont aussi des valeurs identiques.

### Mesure 6 — la divergence `foreign_keys`, précisée

La session précédente avait raison sur le fait, mais l'attribution mérite d'être corrigée :

```
node:sqlite (défaut)                            -> pragma foreign_keys = 1
node:sqlite (enableForeignKeyConstraints:false) -> pragma foreign_keys = 0
@libsql/client (aucune option)                  -> pragma foreign_keys = 1
  après PRAGMA foreign_keys = 0                 -> 0
```

La bibliothèque C SQLite a `foreign_keys = 0` par défaut. **Les deux wrappers** l'activent
d'eux-mêmes — ce n'est donc pas une divergence libSQL-contre-SQLite mais un comportement de
wrapper, que `node:sqlite` partage. libSQL laisse le pragma modifiable normalement. Ce
point est de toute façon orthogonal aux index partiels.

### Mesure 7 — `drizzle-kit generate` émet-il le `WHERE` ?

Schéma jouet écrit avec la syntaxe proposée plus haut, puis :

```
$ node node_modules/drizzle-kit/bin.cjs generate --config=./toy.config.ts
1 tables
task_completions 3 columns 2 indexes 0 fks
[✓] Your SQL migration file ➜ toy-migrations\0000_special_kate_bishop.sql
```

SQL généré — le `WHERE` est bien présent :

```sql
CREATE UNIQUE INDEX `task_completions_occurrence_unique` ON `task_completions` (`task_id`,`occurrence_date`) WHERE "task_completions"."occurrence_date" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `task_completions_board_unique` ON `task_completions` (`task_id`) WHERE "task_completions"."occurrence_date" is null;
```

Snapshot JSON — conservé aussi :

```json
"task_completions_occurrence_unique": {
  "columns": ["task_id", "occurrence_date"],
  "isUnique": true,
  "where": "\"task_completions\".\"occurrence_date\" is not null"
}
```

Drizzle qualifie la colonne (`"task_completions"."occurrence_date"`). La doc SQLite ne parle
que de « names of columns in the table being indexed », donc j'ai vérifié que la forme
qualifiée passe — **oui**, sur les deux moteurs, et le prédicat survit tel quel dans
`sqlite_master`. Le SQL généré rejoué de bout en bout donne le comportement attendu :

```
[ACCEPTÉ] occurrence (t1, 2026-08-04) #1
[REJETÉ ] occurrence (t1, 2026-08-04) #2 doublon
[ACCEPTÉ] occurrence (t1, 2026-08-05) autre date
[ACCEPTÉ] tableau  (t2, NULL) #1
[REJETÉ ] tableau  (t2, NULL) #2 doublon
[ACCEPTÉ] tableau  (t3, NULL) autre tâche
```

Modifier le prédicat dans le schéma est correctement détecté (`DROP` + `CREATE`) :

```sql
DROP INDEX `task_completions_board_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `task_completions_board_unique` ON `task_completions` (`task_id`) WHERE "task_completions"."occurrence_date" is null and "task_completions"."task_id" <> '';
```

### Mesure 8 — `drizzle-kit push` dérive à l'infini (à éviter)

`drizzle-kit` introspecte les index SQLite via `pragma_index_list` / `pragma_index_info`,
qui **n'exposent pas le prédicat partiel** ; le code ne lit pas non plus
`sqlite_master.sql`. Le `where` relu vaut donc toujours `undefined`, et la comparaison
avec le schéma le voit comme un changement.

Deux `push` d'affilée, **sans aucune modification du schéma entre les deux** :

```
=== PUSH #1 (base vide) ===
[✓] Changes applied

=== PUSH #2 (schéma INCHANGÉ - ne devrait rien faire) ===
You are about to execute current statements:
DROP INDEX `task_completions_board_unique`;
DROP INDEX `task_completions_occurrence_unique`;
CREATE UNIQUE INDEX `task_completions_board_unique` ON …
CREATE UNIQUE INDEX `task_completions_occurrence_unique` ON …
```

**Conséquence opérationnelle :** le script `db:push` du `package.json` ne doit pas être
utilisé une fois ces index en place — il détruira et recréera les index à chaque appel.
Le chemin `db:generate` + `db:migrate` compare snapshot contre snapshot et reste stable
(mesure 7). `drizzle-kit pull` / introspect perdrait silencieusement le `WHERE` de la même
façon.

---

## Sources

Sources primaires uniquement — `sqlite.org` et le code installé.

**SQLite**

- [Partial Indexes](https://sqlite.org/partialindex.html) — « Partial indexes have been
  supported in SQLite since version 3.8.0 (2013-08-26). » ; « The expression following the
  WHERE clause may contain operators, literal values, and names of columns in the table
  being indexed. » ; « The WHERE clause may *not* contain subqueries, references to other
  tables, non-deterministic functions, or bound parameters. » ; §2.1 *Unique Partial
  Indexes* : « A partial index definition may include the UNIQUE keyword. If it does, then
  SQLite requires every entry *in the index* to be unique. This provides a mechanism for
  enforcing uniqueness across some subset of the rows in a table. » ; exemple canonique
  `CREATE INDEX po_parent ON purchaseorder(parent_po) WHERE parent_po IS NOT NULL;`
- [CREATE INDEX](https://sqlite.org/lang_createindex.html) — **la citation décisive sur les
  `NULL`** : « For the purposes of unique indices, all NULL values are considered different
  from all other NULL values and are thus unique. »
- [CREATE TABLE](https://sqlite.org/lang_createtable.html) — « For the purposes of UNIQUE
  constraints, NULL values are considered distinct from all other values, including other
  NULLs. »
- [NULL Handling in SQLite Versus Other Database Engines](https://sqlite.org/nulls.html) —
  ligne « NULLs are distinct in a UNIQUE column » : SQLite = *Yes*.
- [Deterministic vs Non-Deterministic Functions](https://sqlite.org/deterministic.html) —
  les fonctions date/heure sont non déterministes « if these functions use the string 'now'
  as the date, or if they use the localtime modifier or the utc modifier ». À confronter à
  la mesure 4, qui montre qu'elles passent quand même.
- [Release 3.8.0](https://sqlite.org/releaselog/3_8_0.html) — « Add support for partial
  indexes », 2013-08-26.

**Drizzle** (code installé, pas la doc de la dernière version)

- `node_modules/drizzle-orm/sqlite-core/indexes.d.ts` — `.where()` vit sur `IndexBuilder`,
  partagée par `index()` et `uniqueIndex()` :
  ```ts
  export declare class IndexBuilder {
      constructor(name: string, columns: IndexColumn[], unique: boolean);
      /** Condition for partial index. */
      where(condition: SQL): this;
  }
  ```
  Il n'y a pas de classe `UniqueIndexBuilder` en sqlite-core ; `uniqueIndex(name)` retourne
  un `IndexBuilderOn` avec `unique: true`. Pas de `.concurrently()` / `.with()` (Postgres).
- `node_modules/drizzle-orm/sqlite-core/table.d.ts` — le 3e argument doit retourner un
  tableau ; les surcharges `Record<string, …>` portent `@deprecated The third parameter of
  sqliteTable is changing and will only accept an array instead of an object`.
- `node_modules/drizzle-kit/bin.cjs` — chaîne complète du `where` : sérialiseur
  (`generateSqliteSnapshot`, `where = dialect.sqlToQuery(value.config.where).sql`), schéma
  zod du snapshot (`where: stringType().optional()`), squash
  (`${idx.name};${idx.columns.join(",")};${idx.isUnique};${idx.where ?? ""}`), et le
  convertisseur SQL `CreateSqliteIndexConvertor` :
  ```js
  const whereStatement = where ? ` WHERE ${where}` : "";
  return `CREATE ${indexPart} \`${name}\` ON \`${statement.tableName}\` (${uniqueString})${whereStatement};`;
  ```
  L'introspection (`pragma_index_list` / `pragma_index_info`) ne relit en revanche que
  `tableName, indexName, columnName, isUnique, seq` — d'où la dérive de `push` (mesure 8).
- [Indexes & Constraints — SQLite](https://orm.drizzle.team/docs/sqlite/indexes-constraints)
  — documente la forme tableau et `.where(sql\`…\`)`, conforme au code 0.45.2 installé.

---

## Ce que je n'ai pas pu établir

- **Le statut de `date('now')` dans un `WHERE` d'index partiel.** Mesuré comme accepté sur
  les deux moteurs, alors que `deterministic.html` le classe non déterministe. Je n'ai pas
  trouvé de source primaire disant si c'est un bug connu, un compromis assumé, ou une
  faille du contrôle. Sans incidence pour PIN-222 ; à ne pas exploiter pour autant.
- **Si la dérive de `drizzle-kit push` est corrigée dans une version plus récente.** Je m'en
  suis tenu à la version installée (0.31.10) comme demandé, sans dépouiller le changelog
  amont.
- **Le comportement sous libSQL *distant*** (Turso/`sqld` via HTTP) — tout a été mesuré sur
  base fichier locale, ce qui est le mode de déploiement de HomeQuest. Rien ne dit que le
  protocole distant se comporte pareil.
- **La forme `PRIMARY KEY` plutôt qu'index unique.** Non explorée ; à noter tout de même que
  SQLite autorise des `NULL` dans une `PRIMARY KEY` non-`INTEGER` (bug historique assumé,
  cf. [quirks](https://sqlite.org/quirks.html) §5), donc une PK ne réglerait pas le
  problème des `NULL` de toute façon.
