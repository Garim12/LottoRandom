<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Copy, Dices, Heart, RefreshCw } from 'lucide-vue-next'
import PensionTicket from './PensionTicket.vue'
import PensionSet from './PensionSet.vue'
import { formatPension, generatePensionDigits, generatePensionNumber, generatePensionSet, regenerateGroup } from '../../utils/pension'
import type { PensionSet as PensionSetType, PensionTicket as PensionTicketType, StoredLottery } from '../../types/lottery'

const props = defineProps<{ restore: StoredLottery | null }>()
const emit = defineEmits<{
  copy: [text: string]
  saveSingle: [ticket: PensionTicketType]
  saveSet: [number: string]
  rememberSingle: [ticket: PensionTicketType]
  rememberSet: [number: string]
  notify: [message: string]
}>()
const mode = ref<'single' | 'set'>('single')
const ticket = ref<PensionTicketType | null>(null)
const set = ref<PensionSetType | null>(null)
const current = computed(() => mode.value === 'single' ? ticket.value !== null : set.value !== null)

watch(() => props.restore, (item) => {
  if (!item || item.type !== 'pension') return
  if (item.mode === 'single') {
    mode.value = 'single'
    ticket.value = { ...item.ticket }
  } else {
    mode.value = 'set'
    set.value = { number: item.number, tickets: Array.from({ length: 5 }, (_, index) => ({ group: index + 1, number: item.number })) }
  }
}, { immediate: true })

function makeSingle() {
  safely(() => {
    ticket.value = generatePensionNumber()
    emit('rememberSingle', { ...ticket.value })
  })
}
function makeSet() {
  safely(() => {
    set.value = generatePensionSet()
    emit('rememberSet', set.value.number)
  })
}
function changeGroup() {
  if (!ticket.value) return
  safely(() => {
    ticket.value = regenerateGroup(ticket.value!)
    emit('rememberSingle', { ...ticket.value })
  })
}
function changeDigits() {
  if (!ticket.value) return
  safely(() => {
    ticket.value = { ...ticket.value!, number: generatePensionDigits() }
    emit('rememberSingle', { ...ticket.value })
  })
}
function changeSetDigits() {
  if (!set.value) return
  makeSet()
}
function safely(action: () => void) {
  try { action() }
  catch (error) { emit('notify', error instanceof Error ? error.message : '번호를 생성하지 못했습니다. 브라우저 보안 기능을 확인해 주세요.') }
}
function copyCurrent() {
  if (mode.value === 'single' && ticket.value) emit('copy', formatPension(ticket.value))
  if (mode.value === 'set' && set.value) emit('copy', set.value.tickets.map(formatPension).join('\n'))
}
function saveCurrent() {
  if (mode.value === 'single' && ticket.value) emit('saveSingle', { ...ticket.value })
  if (mode.value === 'set' && set.value) emit('saveSet', set.value.number)
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
    <div class="min-w-0 space-y-6">
      <section class="relative overflow-clip rounded-[30px] bg-violet-800 px-5 py-7 text-white shadow-xl shadow-violet-950/15 sm:px-8 sm:py-9">
        <div class="pointer-events-none absolute -right-10 -top-16 size-60 rounded-full border-[40px] border-white/5" aria-hidden="true"></div>
        <div class="relative">
          <p class="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-violet-100">✦ 연금복권 720+</p>
          <h2 class="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">한 장도, 다섯 조도<br />손쉽게 만들어 보세요.</h2>
          <p class="mt-3 max-w-md text-sm leading-6 text-violet-100/85">조와 여섯 자리 번호를 무작위로 생성합니다. 앞자리 0도 그대로 보여드려요.</p>
          <div class="mt-7 rounded-2xl bg-white/10 p-3.5 sm:p-5">
            <div class="grid grid-cols-2 gap-2" role="group" aria-label="연금복권 생성 방식">
              <button type="button" class="count-button" :class="mode === 'single' ? 'count-button-active' : ''" :aria-pressed="mode === 'single'" @click="mode = 'single'">낱장 번호</button>
              <button type="button" class="count-button" :class="mode === 'set' ? 'count-button-active' : ''" :aria-pressed="mode === 'set'" @click="mode = 'set'">5개조 세트</button>
            </div>
            <button type="button" class="primary-button mt-4 w-full bg-white text-violet-800 hover:bg-violet-50" @click="mode === 'single' ? makeSingle() : makeSet()"><Dices :size="21" aria-hidden="true" /> {{ mode === 'single' ? '낱장 번호 생성' : '5개조 세트 생성' }}</button>
          </div>
        </div>
      </section>
      <section class="space-y-4" aria-live="polite">
        <div class="flex items-center justify-between px-1">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white">생성 결과</h2>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ mode === 'single' ? '1~5조 · 6자리 번호' : '같은 번호로 1~5조 전체' }}</p>
          </div>
        </div>
        <div v-if="current" class="space-y-4">
          <PensionTicket v-if="mode === 'single' && ticket" :ticket="ticket" />
          <PensionSet v-if="mode === 'set' && set" :set="set" />
          <div class="flex flex-wrap gap-2">
            <button type="button" class="secondary-button" @click="copyCurrent"><Copy :size="16" aria-hidden="true" /> 복사</button>
            <button type="button" class="secondary-button" @click="saveCurrent"><Heart :size="16" aria-hidden="true" /> 저장</button>
          </div>
        </div>
        <div v-else class="grid min-h-52 place-items-center rounded-[26px] border border-dashed border-slate-300 bg-white/60 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <div><p class="text-3xl font-black tracking-[.2em] text-slate-300 dark:text-slate-600">······</p><p class="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">번호가 여기에 나타나요</p></div>
        </div>
      </section>
    </div>
    <aside class="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 lg:sticky lg:top-5">
      <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">부분 재생성</h3>
      <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">마음에 드는 부분은 그대로 두고 바꿔보세요.</p>
      <div v-if="mode === 'single'" class="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        <button type="button" class="secondary-button justify-center" :disabled="!ticket" @click="changeGroup"><RefreshCw :size="16" aria-hidden="true" /> 조만 다시 생성</button>
        <button type="button" class="secondary-button justify-center" :disabled="!ticket" @click="changeDigits"><RefreshCw :size="16" aria-hidden="true" /> 번호만 다시 생성</button>
        <button type="button" class="secondary-button justify-center" :disabled="!ticket" @click="makeSingle"><RefreshCw :size="16" aria-hidden="true" /> 전체 다시 생성</button>
      </div>
      <button v-else type="button" class="secondary-button mt-4 w-full justify-center" :disabled="!set" @click="changeSetDigits"><RefreshCw :size="16" aria-hidden="true" /> 세트 번호 다시 생성</button>
    </aside>
  </div>
</template>

