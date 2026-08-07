<script setup lang="ts">
// Sélection du profil — Décision #9 (appareil familial partagé).
const { data: profiles, pending } = await useFetch('/api/auth/profiles')
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 p-6">
    <header class="text-center">
      <p class="text-sm font-medium uppercase tracking-widest text-brand-600">HomeQuest</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-800">Qui es-tu ?</h1>
    </header>

    <p v-if="pending" class="text-slate-400">Chargement…</p>

    <ul v-else class="flex flex-wrap items-start justify-center gap-6">
      <li v-for="p in profiles" :key="p.id">
        <NuxtLink
          :to="`/login/${p.id}`"
          class="group flex w-28 flex-col items-center gap-3"
        >
          <span
            class="grid size-24 place-items-center rounded-full bg-brand-500 text-3xl font-bold text-white shadow-sm transition active:scale-95 group-hover:bg-brand-600"
          >
            {{ p.name.charAt(0).toUpperCase() }}
          </span>
          <span class="truncate text-center text-sm font-medium text-slate-700">{{ p.name }}</span>
        </NuxtLink>
      </li>

      <li>
        <NuxtLink to="/login/new" class="flex w-28 flex-col items-center gap-3">
          <span
            class="grid size-24 place-items-center rounded-full border-2 border-dashed border-slate-300 text-4xl text-slate-400 transition active:scale-95 hover:border-brand-500 hover:text-brand-500"
          >
            +
          </span>
          <span class="text-center text-sm font-medium text-slate-500">Ajouter</span>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
