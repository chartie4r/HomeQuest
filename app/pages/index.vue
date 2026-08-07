<script setup lang="ts">
// Accueil (protégé par le middleware global). Placeholder tant que le domaine
// des quêtes n'est pas modélisé.
const { user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <main class="grid min-h-screen place-items-center p-6">
    <div class="text-center">
      <p class="text-sm font-medium uppercase tracking-widest text-brand-600">HomeQuest</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-800">Bonjour {{ user?.name }} 👋</h1>
      <p class="mt-2 text-slate-500">Les quêtes arrivent bientôt.</p>
      <button
        type="button"
        class="mt-8 rounded-full bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition active:scale-95 hover:bg-brand-700"
        @click="logout"
      >
        Se déconnecter
      </button>
    </div>
  </main>
</template>
