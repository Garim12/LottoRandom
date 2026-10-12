<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Copy, Dices, Heart, RefreshCw } from 'lucide-vue-next'
import PensionTicket from './PensionTicket.vue'
import PensionSet from './PensionSet.vue'
import PensionStrategies from './PensionStrategies.vue'
import { defaultPensionFilters, PENSION_POSITIONS, formatPension, generatePensionDigits, generatePensionNumber, generatePensionSet, generatePensionSpread, regenerateGroup } from '../../utils/pension'
import { pensionStrategyPlan, summarizePensionHistory, trainPensionModel } from '../../utils/pensionStrategies'
import { validatePensionHistory } from '../../utils/pensionHistory'
import type { StrategyId, StrategyWeights } from '../../utils/lottoStrategies'
import historyData from '../../data/pension-history.json'
import type { PensionOptions, PensionSet as PensionSetType, PensionTicket as PensionTicketType, StoredLottery } from '../../types/lottery'

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
const method = ref<'random' | 'filtered' | 'strategies'>('random')
const filters = ref(defaultPensionFilters())
const strategy = ref<StrategyId>('random')
const historyWindow = ref(100)
const customWeights = ref<StrategyWeights>({ ml: 4, frequency: 2, gap: 2, fibonacci: 0 })
const history = validatePensionHistory(historyData)
const draws = computed(() => historyWindow.value ? history.draws.slice(-historyWindow.value) : history.draws)
const stats = computed(() => summarizePensionHistory(draws.value))
const model = computed(() => method.value === 'strategies' && ['ml', 'custom'].includes(strategy.value) ? trainPensionModel(draws.value) : null)
const freshSelection = () => ({ group: null as number | null, fixedDigits: Array<number | null>(6).fill(null), excludedDigits: [] as number[] })
const selection = ref(freshSelection())
const showAnalysis = ref(false)
watch(method, (value) => { if (value !== 'random') showAnalysis.value = true })

function options(): PensionOptions {
  const plan = method.value === 'strategies' ? pensionStrategyPlan(strategy.value, stats.value, model.value, customWeights.value) :
    method.value === 'filtered' ? { filters: filters.value } : {}
  return { ...plan, ...selection.value, group: mode.value === 'set' ? null : selection.value.group }
}
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
    ticket.value = generatePensionNumber(options())
    emit('rememberSingle', { ...ticket.value })
  })
}
function makeSet() {
  safely(() => {
    set.value = generatePensionSet(options())
    emit('rememberSet', set.value.number)
  })
}
function makeSpread() {
  safely(() => {
    spread.value = generatePensionSpread(options())
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
    ticket.value = regenerateGroup(ticket.value!, options())
    emit('rememberSingle', { ...ticket.value })
  })
}
function changeDigits() {
  if (!ticket.value) return
  safely(() => {
    ticket.value = { ...ticket.value!, number: generatePensionDigits(options()) }
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
            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="연금복권 번호 선택 방식">
              <button v-for="item in ([['random', '기본 무작위'], ['filtered', '조건 생성'], ['strategies', '10가지 전략']] as const)" :key="item[0]" type="button" class="count-button" :class="method === item[0] ? 'count-button-active' : ''" :aria-pressed="method === item[0]" @click="method = item[0]">{{ item[1] }}</button>
            </div>
            <fieldset v-if="method === 'filtered'" class="mt-4 rounded-2xl border border-white/20 p-4">
              <legend class="px-2 text-sm font-bold">연금복권 조합 조건</legend>
              <div class="grid grid-cols-2 gap-3">
                <label class="text-xs font-semibold">합계 최소<input v-model.number="filters.sumMin" type="number" min="0" max="54" step="1" required class="condition-input bg-violet-950" /></label>
                <label class="text-xs font-semibold">합계 최대<input v-model.number="filters.sumMax" type="number" min="0" max="54" step="1" required class="condition-input bg-violet-950" /></label>
                <label class="col-span-2 text-xs font-semibold">홀짝 비율<select v-model="filters.oddCount" class="condition-input bg-violet-950"><option :value="null">제한 없음</option><option v-for="odd in [0, 1, 2, 3, 4, 5, 6]" :key="odd" :value="odd">홀수 {{ odd }} : 짝수 {{ 6 - odd }}</option></select></label>
                <label class="col-span-2 text-xs font-semibold">같은 숫자 허용<select v-model="filters.maxRepeat" class="condition-input bg-violet-950"><option :value="6">제한 없음</option><option v-for="limit in [1, 2, 3, 4, 5]" :key="limit" :value="limit">최대 {{ limit }}개</option></select></label>
                <label class="col-span-2 text-xs font-semibold">최소 사용 구간<select v-model="filters.minRanges" class="condition-input bg-violet-950"><option :value="1">제한 없음</option><option :value="2">2개 구간 이상</option><option :value="3">3개 구간 모두</option></select></label>
              </div>
              <p class="mt-2 text-xs leading-5 text-violet-100">조를 제외한 6자리 기준 · 구간 0–2 / 3–5 / 6–9 · 0은 짝수입니다.</p>
              <div class="mt-3 flex flex-wrap gap-2"><button type="button" class="count-button text-xs" @click="filters = { sumMin: 18, sumMax: 36, oddCount: 3, maxRepeat: 2, minRanges: 3 }">균형 조건 예시</button><button type="button" class="count-button text-xs" @click="filters = defaultPensionFilters()">조합 조건 초기화</button></div>
            </fieldset>
            <PensionStrategies v-if="method === 'strategies'" v-model:strategy="strategy" v-model:window="historyWindow" v-model:weights="customWeights" :draws="draws" :stats="stats" :model="model" />
            <p class="mt-3 text-xs leading-5 text-violet-100">전략·조건은 다음 생성과 재생성부터 적용됩니다. 부분 재생성은 선택한 부분만 바꿉니다. 당첨 확률을 높이는 기능은 아닙니다.</p>
            <button type="button" class="primary-button mt-4 w-full bg-white text-violet-800 hover:bg-violet-50" @click="generate"><Dices :size="21" aria-hidden="true" /> {{ modeLabel }} 생성</button>
          </div>
        </div>
      </section>
      <section class="space-y-4" aria-live="polite">
        <div class="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white">생성 결과</h2>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ mode === 'single' ? '1~5조 · 6자리 번호' : mode === 'set' ? '같은 번호로 1~5조 전체' : '끝자리 중복 없는 5장 · 조 선택 설정 적용' }}</p>
          </div>
          <button type="button" class="secondary-button" :aria-pressed="showAnalysis" @click="showAnalysis = !showAnalysis">{{ showAnalysis ? '조합 분석 숨기기' : '조합 분석 보기' }}</button>
        </div>
        <p v-if="showAnalysis" class="px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">현재 6자리 번호의 구성을 계산합니다. 합계의 이론 평균은 27이며 예측 점수가 아닙니다. 세트는 같은 번호의 분석을 한 번 표시합니다.</p>
        <div v-if="current" class="space-y-4">
          <PensionTicket v-if="mode === 'single' && ticket" :ticket="ticket" :analysis="showAnalysis" />
          <PensionSet v-if="mode === 'set' && set" :set="set" :analysis="showAnalysis" />
          <div v-if="mode === 'spread'" class="space-y-2" aria-label="끝자리가 서로 다른 분산 5장">
            <PensionTicket v-for="ticket in spread" :key="ticket.number" :ticket="ticket" compact :analysis="showAnalysis" />
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
      <fieldset class="mb-6 text-xs text-slate-700 dark:text-slate-200">
        <legend class="mb-3 text-sm font-extrabold">조·자리 고정 및 숫자 제외</legend>
        <label class="block">고정 조<select v-model="selection.group" :disabled="mode === 'set'" class="condition-input bg-violet-950"><option :value="null">제한 없음</option><option v-for="n in 5" :key="n" :value="n">{{ n }}조</option></select></label>
        <p v-if="mode === 'set'" class="mt-2 leading-5">세트는 조 고정 설정과 관계없이 1~5조를 모두 만듭니다.</p>
        <div class="mt-3 grid grid-cols-2 gap-2"><label v-for="(label, position) in PENSION_POSITIONS" :key="label">{{ label }} 고정<select v-model="selection.fixedDigits[position]" class="condition-input bg-violet-950"><option :value="null">제한 없음</option><option v-for="digit in [0,1,2,3,4,5,6,7,8,9]" :key="digit" :value="digit">{{ digit }}</option></select></label></div>
        <fieldset class="mt-4"><legend class="mb-2 font-semibold">모든 자리에서 제외할 숫자</legend><div class="grid grid-cols-5 gap-1"><label v-for="digit in [0,1,2,3,4,5,6,7,8,9]" :key="digit" class="flex min-h-10 items-center justify-center gap-1"><input v-model="selection.excludedDigits" type="checkbox" :value="digit" :aria-label="`${digit} 제외`" class="accent-violet-600" />{{ digit }}</label></div></fieldset>
        <button type="button" class="secondary-button mt-3" @click="selection = freshSelection()">고정·제외 초기화</button>
        <p class="mt-2 leading-5 text-slate-500 dark:text-slate-400">고정·제외는 모든 전략에 적용됩니다. 분산 5장은 조건에 맞는 끝자리가 5개 이상 필요합니다.</p>
      </fieldset>
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

