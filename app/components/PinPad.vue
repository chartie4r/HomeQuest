<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    length?: number
    disabled?: boolean
    error?: boolean
  }>(),
  { length: 4, disabled: false, error: false },
)

const emit = defineEmits<{
  complete: [pin: string]
}>()

const digits = ref<string[]>([])

function press(n: number) {
  if (props.disabled || digits.value.length >= props.length) return
  digits.value.push(String(n))
  if (digits.value.length === props.length) {
    emit('complete', digits.value.join(''))
  }
}

function backspace() {
  if (props.disabled) return
  digits.value.pop()
}

function clear() {
  digits.value = []
}

// Le parent réinitialise le clavier après un échec.
defineExpose({ clear })

const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9]
</script>

<template>
  <div class="flex flex-col items-center gap-8">
    <!-- Points d'état -->
    <div class="flex gap-4" :class="{ 'animate-shake': error }" aria-hidden="true">
      <span
        v-for="i in length"
        :key="i"
        class="size-4 rounded-full border-2 transition-colors"
        :class="[
          error ? 'border-red-500' : 'border-brand-600',
          digits.length >= i ? (error ? 'bg-red-500' : 'bg-brand-600') : 'bg-transparent',
        ]"
      />
    </div>

    <!-- Clavier -->
    <div class="grid grid-cols-3 gap-4">
      <button
        v-for="n in keys"
        :key="n"
        type="button"
        :disabled="disabled"
        class="size-20 rounded-full bg-white text-2xl font-semibold text-slate-800 shadow-sm transition active:scale-95 hover:bg-brand-50 disabled:opacity-40"
        @click="press(n)"
      >
        {{ n }}
      </button>

      <div />

      <button
        type="button"
        :disabled="disabled"
        class="size-20 rounded-full bg-white text-2xl font-semibold text-slate-800 shadow-sm transition active:scale-95 hover:bg-brand-50 disabled:opacity-40"
        @click="press(0)"
      >
        0
      </button>

      <button
        type="button"
        :disabled="disabled"
        aria-label="Effacer"
        class="size-20 rounded-full text-xl text-slate-500 transition active:scale-95 hover:bg-white disabled:opacity-40"
        @click="backspace"
      >
        ⌫
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>
