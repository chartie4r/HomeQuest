import { createDbClient } from './client'
import * as schema from './schema'
import { hashPin } from '../utils/auth'
import { normalizeSteps } from '../utils/steps'

/**
 * Seed — Décision #11 : pas de tests en v1, on s'appuie sur un jeu de données
 * « pré-vieilli » (dates dans le passé) pour valider les calculs paresseux.
 *
 * Jeu d'exemple repris de docs/modele-definition.md §4 (PIN-210) : les quatre
 * membres du foyer, une routine (« Avant l'école », à Léo) et ses trois
 * tâches, plus une tâche du tableau avec étapes. Id littéraux fixes pour
 * rester idempotent — `routines`/`tasks` n'ont aucune unicité de titre,
 * `onConflictDoNothing()` ne suffit qu'en conflictant sur l'id.
 */
async function seed() {
  const url = process.env.NUXT_DATABASE_URL ?? 'file:./data/homequest.db'
  const db = createDbClient(url)

  const [uLeo, uJules, uMylene, uJonathan] = await Promise.all([
    hashPin('1111'),
    hashPin('2222'),
    hashPin('3333'),
    hashPin('4444'),
  ])

  await db
    .insert(schema.users)
    .values([
      { id: 'u_leo', name: 'Léo', pinHash: uLeo },
      { id: 'u_jules', name: 'Jules', pinHash: uJules },
      { id: 'u_mylene', name: 'Mylène', pinHash: uMylene },
      { id: 'u_jonathan', name: 'Jonathan', pinHash: uJonathan },
    ])
    .onConflictDoNothing()

  await db
    .insert(schema.routines)
    .values({
      id: 'rt_leo_ecole',
      title: "Avant l'école",
      ownerId: 'u_leo',
      recurrence: 'daily',
      anchorDate: '2026-08-01',
    })
    .onConflictDoNothing()

  await db
    .insert(schema.tasks)
    .values([
      {
        id: 'tk_lit',
        title: 'Faire son lit',
        routineId: 'rt_leo_ecole',
        position: 0,
        xp: 10,
        points: 5,
        createdBy: 'u_mylene',
      },
      {
        id: 'tk_dents',
        title: 'Se brosser les dents',
        routineId: 'rt_leo_ecole',
        position: 1,
        xp: 10,
        points: 5,
        createdBy: 'u_mylene',
      },
      {
        id: 'tk_chat',
        title: 'Nourrir le chat',
        routineId: 'rt_leo_ecole',
        position: 2,
        xp: 10,
        points: 5,
        createdBy: 'u_mylene',
      },
      {
        id: 'tk_lave_vaisselle',
        title: 'Vider le lave-vaisselle',
        description:
          'La vaisselle propre est rangée, la sale entre. Les verres sur la tablette du haut, s\'il te plaît.',
        routineId: null,
        position: 0,
        xp: 25,
        points: 8,
        steps: normalizeSteps([
          'Tablette du haut : verres et tasses',
          'Tiroir à ustensiles',
          'Mettre la vaisselle sale',
        ]),
        estimatedMinutes: 10,
        oneTime: false,
        createdBy: 'u_jonathan',
      },
    ])
    .onConflictDoNothing()

  console.log('✓ Seed terminé')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
