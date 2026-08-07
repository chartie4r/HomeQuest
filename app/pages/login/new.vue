<script setup lang="ts">
// Création d'un profil — Décision #9 (création ouverte, appareil familial).
const name = ref('')
const pad = ref<{ clear: () => void } | null>(null)
const error = ref('')
const loading = ref(false)

async function onComplete(pin: string) {
  if (!name.value.trim()) {
    error.value = 'Entre d’abord un nom'
    pad.value?.clear()
    return
  }
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/profiles', {
      method: 'POST',
      body: { name: name.value.trim(), pin },
    })
    await navigateTo('/login')
  } catch (err: unknown) {
    error.value = (err as { statusMessage?: string })?.statusMessage ?? 'Création impossible'
    pad.value?.clear()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-6">
    <NuxtLink to="/login" class="self-start text-sm text-slate-400 hover:text-slate-600">
      ← Retour
    </NuxtLink>

    <header class="text-center">
      <h1 class="text-xl font-bold text-slate-800">Nouveau profil</h1>
      <p class="mt-1 text-sm text-slate-400">Choisis un nom, puis un NIP à 4 chiffres.</p>
    </header>

    <input
      v-model="name"
      type="text"
      maxlength="80"
      placeholder="Prénom"
      class="w-full rounded-card border border-slate-200 bg-white px-4 py-3 text-center text-lg outline-none focus:border-brand-500"
    >

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <PinPad ref="pad" :disabled="loading" @complete="onComplete" />
  </main>
</template>
