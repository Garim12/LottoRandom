<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Copy, Dices, Heart, RefreshCw } from 'lucide-vue-next'
import PensionTicket from './PensionTicket.vue'
import PensionSet from './PensionSet.vue'
import { formatPension, generatePensionDigits, generatePensionNumber, generatePensionSet, generatePensionSpread, regenerateGroup } from '../../utils/pension'
import type { PensionSet as PensionSetType, PensionTicket as PensionTicketType, StoredLottery } from '../../types/lottery'

const props = defineProps<{ restore: StoredLottery | null }>()
const emit = defineEmits<{
  copy: [text: string]
  saveSingle: [ticket: PensionTicketType]
  saveSet: [number: string]
  saveSpread: [tickets: PensionTicketType[]]
  rememberSingle: [ticket: PensionTicketType]
  rememberSet: [number: string]
  rememberSpread: [tickets: PensionTicketType[]]
  notify: [message: string]
}>()
const mode = ref<'single' | 'set' | 'spread'>('single')
const ticket = ref<PensionTicketType | null>(null)
const set = ref<PensionSetType | null>(null)
const spread = ref<PensionTicketType[]>([])
const current = computed(() => mode.value === 'single' ? ticket.value !== null : mode.value === 'set' ? set.value !== null : spread.value.length === 5)
const modeLabel = computed(() => ({ single: '낱장 번호', set: '5개조 세트', spread: '분산 5장' })[mode.value])

watch(() => props.restore, (item) => {
  if (!item || item.type !== 'pension') return
  if (item.mode === 'single') {
    mode.value = 'single'
    ticket.value = { ...item.ticket }
  } else if (item.mode === 'set') {
    mode.value = 'set'
    set.value = { number: item.number, tickets: Array.from({ length: 5 }, (_, index) => ({ group: index + 1, number: item.number })) }
  } else {
    mode.value = 'spread'
    spread.value = item.tickets.map((ticket) => ({ ...ticket }))
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
function makeSpread() {
  safely(() => {
    spread.value = generatePensionSpread()
    emit('rememberSpread', spread.value.map((ticket) => ({ ...ticket })))
  })
}
function generate() {
  if (mode.value === 'single') makeSingle()
  else if (mode.value === 'set') makeSet()
  else makeSpread()
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
  if (mode.value === 'spread' && spread.value.length) emit('copy', spread.value.map(formatPension).join('\n'))
}
function saveCurrent() {
  if (mode.value === 'single' && ticket.value) emit('saveSingle', { ...ticket.value })
  if (mode.value === 'set' && set.value) emit('saveSet', set.value.number)
  if (mode.value === 'spread' && spread.value.length) emit('saveSpread', spread.value.map((ticket) => ({ ...ticket })))
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
    <div class="min-w-0 space-y-6">
      <section class="relative overflow-clip rounded-[30px] bg-violet-800 px-5 py-7 text-white shadow-xl shadow-violet-950/15 sm:px-8 sm:py-9">
        <div class="pointer-events-none absolute -right-10 -top-16 size-60 rounded-full border-[40px] border-white/5" aria-hidden="true"></div>
        <div class="relative">
          <p class="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-violet-100">✦ 연금복권 720+</p>
          <h2 class="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">한 장도, 다섯 장도<br />손쉽게 만들어 보세요.</h2>
          <p class="mt-3 max-w-md text-sm leading-6 text-violet-100/85">조와 여섯 자리 번호를 무작위로 생성합니다. 앞자리 0도 그대로 보여드려요.</p>
          <div class="mt-7 rounded-2xl bg-white/10 p-3.5 sm:p-5">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="연금복권 생성 방식" aria-describedby="pension-mode-help">
              <button type="button" class="count-button" :class="mode === 'single' ? 'count-button-active' : ''" :aria-pressed="mode === 'single'" @click="mode = 'single'">낱장 번호</button>
              <button type="button" class="count-button" :class="mode === 'set' ? 'count-button-active' : ''" :aria-pressed="mode === 'set'" @click="mode = 'set'">5개조 세트</button>
              <button type="button" class="count-button" :class="mode === 'spread' ? 'count-button-active' : ''" :aria-pressed="mode === 'spread'" @click="mode = 'spread'">분산 5장</button>
            </div>
            <p id="pension-mode-help" class="mt-3 text-xs leading-5 text-violet-100" aria-live="polite">{{ mode === 'spread' ? '끝자리가 서로 다른 5장을 만들어요. 조는 중복될 수 있어요. 당첨 결과를 분산하는 방식이며, 같은 장수의 1등 확률이나 기대 당첨금을 높이지 않아요.' : mode === 'set' ? '같은 6자리 번호를 1~5조로 만들어요. 당첨 시 여러 장이 함께 맞는 구성이에요.' : '1~5조와 000000~999999 사이의 번호를 무작위로 만들어요.' }}</p>
            <button type="button" class="primary-button mt-4 w-full bg-white text-violet-800 hover:bg-violet-50" @click="generate"><Dices :size="21" aria-hidden="true" /> {{ modeLabel }} 생성</button>
          </div>
        </div>
      </section>
      <section class="space-y-4" aria-live="polite">
        <div class="flex items-center justify-between px-1">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white">생성 결과</h2>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ mode === 'single' ? '1~5조 · 6자리 번호' : mode === 'set' ? '같은 번호로 1~5조 전체' : '끝자리 중복 없는 5장 · 조는 무작위' }}</p>
          </div>
        </div>
        <div v-if="current" class="space-y-4">
          <PensionTicket v-if="mode === 'single' && ticket" :ticket="ticket" />
          <PensionSet v-if="mode === 'set' && set" :set="set" />
          <div v-if="mode === 'spread'" class="space-y-2" aria-label="끝자리가 서로 다른 분산 5장">
            <PensionTicket v-for="ticket in spread" :key="ticket.number" :ticket="ticket" compact />
          </div>
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
      <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">{{ mode === 'single' ? '부분 재생성' : '번호 재생성' }}</h3>
      <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ mode === 'single' ? '마음에 드는 부분은 그대로 두고 바꿔보세요.' : mode === 'set' ? '같은 번호의 1~5조 세트를 다시 만들어요.' : '끝자리가 겹치지 않도록 5장을 함께 다시 만들어요.' }}</p>
      <div v-if="mode === 'single'" class="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        <button type="button" class="secondary-button justify-center" :disabled="!ticket" @click="changeGroup"><RefreshCw :size="16" aria-hidden="true" /> 조만 다시 생성</button>
        <button type="button" class="secondary-button justify-center" :disabled="!ticket" @click="changeDigits"><RefreshCw :size="16" aria-hidden="true" /> 번호만 다시 생성</button>
        <button type="button" class="secondary-button justify-center" :disabled="!ticket" @click="makeSingle"><RefreshCw :size="16" aria-hidden="true" /> 전체 다시 생성</button>
      </div>
      <button v-else-if="mode === 'set'" type="button" class="secondary-button mt-4 w-full justify-center" :disabled="!set" @click="changeSetDigits"><RefreshCw :size="16" aria-hidden="true" /> 세트 번호 다시 생성</button>
      <button v-else type="button" class="secondary-button mt-4 w-full justify-center" :disabled="!current" @click="makeSpread"><RefreshCw :size="16" aria-hidden="true" /> 분산 5장 다시 생성</button>
    </aside>
  </div>
</template>

