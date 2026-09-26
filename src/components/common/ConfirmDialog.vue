<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
const props = defineProps<{ open: boolean; title: string; description: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const cancelButton = ref<HTMLButtonElement | null>(null)
watch(() => props.open, async (visible) => { if (visible) { await nextTick(); cancelButton.value?.focus() } })
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" @click.self="emit('cancel')" @keydown.esc="emit('cancel')">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"
        class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
        <h2 id="confirm-title" class="text-xl font-extrabold text-slate-900 dark:text-white">{{ title }}</h2>
        <p id="confirm-description" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ description }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button ref="cancelButton" type="button" class="secondary-button" @click="emit('cancel')">취소</button>
          <button type="button" class="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500" @click="emit('confirm')">모두 삭제</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
