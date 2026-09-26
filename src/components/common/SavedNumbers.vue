<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Copy, Heart, History, RotateCcw, Trash2, X } from 'lucide-vue-next'
import type { StoredLottery } from '../../types/lottery'
import { formatLotto } from '../../utils/lotto'
import { formatPension } from '../../utils/pension'

const props = defineProps<{ kind: 'favorites' | 'history'; items: StoredLottery[] }>()
const emit = defineEmits<{
  close: []
  copy: [text: string]
  load: [item: StoredLottery]
  remove: [id: string]
  clear: []
}>()
const title = computed(() => props.kind === 'favorites' ? '저장한 번호' : '최근 생성 기록')
const closeButton = ref<HTMLButtonElement | null>(null)
watch(() => props.kind, async () => { await nextTick(); closeButton.value?.focus() }, { immediate: true })

function textFor(item: StoredLottery): string {
  if (item.type === 'lotto') return formatLotto(item.numbers)
  if (item.mode === 'single') return formatPension(item.ticket)
  return Array.from({ length: 5 }, (_, index) => `${index + 1}조 ${item.number}`).join('\n')
}
function labelFor(item: StoredLottery): string {
  return item.type === 'lotto' ? '로또 6/45' : item.mode === 'single' ? '연금복권 낱장' : '연금복권 5개조 세트'
}
function dateFor(item: StoredLottery): string {
  const date = new Date(item.createdAt)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-5" @click.self="emit('close')" @keydown.esc="emit('close')">
      <section role="dialog" aria-modal="true" :aria-label="title" class="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[28px] bg-white shadow-2xl dark:bg-slate-900 sm:rounded-[28px]">
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div class="flex items-center gap-3">
            <span class="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><Heart v-if="kind === 'favorites'" :size="20" aria-hidden="true" /><History v-else :size="20" aria-hidden="true" /></span>
            <div><h2 class="text-lg font-extrabold text-slate-900 dark:text-white">{{ title }}</h2><p class="text-xs text-slate-500 dark:text-slate-400">{{ items.length }}개 번호</p></div>
          </div>
          <button ref="closeButton" type="button" class="icon-button" aria-label="목록 닫기" @click="emit('close')"><X :size="20" aria-hidden="true" /></button>
        </div>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div v-if="!items.length" class="grid min-h-56 place-items-center text-center"><div><Heart :size="31" class="mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" /><p class="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{{ kind === 'favorites' ? '아직 저장한 번호가 없어요' : '아직 생성 기록이 없어요' }}</p><p class="mt-1 text-xs text-slate-500 dark:text-slate-400">번호를 생성하면 여기에서 다시 볼 수 있어요.</p></div></div>
          <article v-for="item in items" :key="item.id" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div class="flex items-start justify-between gap-2"><span class="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">{{ labelFor(item) }}</span><time class="text-[11px] text-slate-500 dark:text-slate-400" :datetime="item.createdAt">{{ dateFor(item) }}</time></div>
            <p class="mt-2 whitespace-pre-line break-words text-sm font-bold leading-7 text-slate-900 dark:text-white">{{ textFor(item) }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="secondary-button" @click="emit('load', item)"><RotateCcw :size="15" aria-hidden="true" /> 불러오기</button>
              <button type="button" class="secondary-button" @click="emit('copy', textFor(item))"><Copy :size="15" aria-hidden="true" /> 복사</button>
              <button v-if="kind === 'favorites'" type="button" class="secondary-button text-rose-600 dark:text-rose-300" :aria-label="`${labelFor(item)} 저장 번호 삭제`" @click="emit('remove', item.id)"><Trash2 :size="15" aria-hidden="true" /> 삭제</button>
            </div>
          </article>
        </div>
        <div v-if="items.length" class="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800 sm:px-6"><button type="button" class="secondary-button w-full justify-center text-rose-600 dark:text-rose-300" @click="emit('clear')"><Trash2 :size="16" aria-hidden="true" /> {{ title }} 전체 삭제</button></div>
      </section>
    </div>
  </Teleport>
</template>
