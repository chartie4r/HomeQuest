<script setup lang="ts">
// Saisie du NIP pour le profil choisi — Décision #9.
const route = useRoute()
const id = route.params.id as string

const { data: profiles } = await useFetch('/api/auth/profiles')
const profile = computed(() => profiles.value?.find((p) => p.id === id))

const { fetch: refreshSession } = useUserSession()
const pad = ref<{ clear: () => void } | null>(null)
const error = ref(false)
const loading = ref(false)

async function onComplete(pin: string) {
  loading.value = true
  error.value = false
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { userId: id, pin },
    })
    await refreshSession()
    await navigateTo('/')
  } catch {
    error.value = true
    pad.value?.clear()
    setTimeout(() => (error.value = false), 500)
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

    <header class="flex flex-col items-center gap-3">
      <span class="grid size-20 place-items-center rounded-full bg-brand-500 text-3xl font-bold text-white">
        {{ profile?.name?.charAt(0).toUpperCase() ?? '?' }}
      </span>
      <h1 class="text-xl font-bold text-slate-800">{{ profile?.name ?? 'Profil' }}</h1>
      <p class="text-sm" :class="error ? 'text-red-500' : 'text-slate-400'">
        {{ error ? 'NIP incorrect' : 'Entre ton NIP' }}
      </p>
    </header>

    <PinPad ref="pad" :disabled="loading" :error="error" @complete="onComplete" />
  </main>
</template>
