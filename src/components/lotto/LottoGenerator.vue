<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, Dices, RefreshCw, SlidersHorizontal } from 'lucide-vue-next'
import LottoGame from './LottoGame.vue'
import LottoNumberSelector from './LottoNumberSelector.vue'
import { formatLotto, generateLottoGames, regenerateLottoGame } from '../../utils/lotto'
import type { GameCount, LottoSelection } from '../../types/lottery'

const props = defineProps<{ restore: number[] | null }>()
const emit = defineEmits<{
  copy: [text: string]
  save: [numbers: number[]]
  remember: [numbers: number[]]
  notify: [message: string, tone: 'error' | 'info']
}>()
const count = ref<GameCount>(5)
const spread = ref(false)
const selection = ref<LottoSelection>({ fixed: [], excluded: [] })
const games = ref<number[][]>([])
const selectorOpen = ref(false)
const hasConditions = computed(() => selection.value.fixed.length + selection.value.excluded.length > 0)

watch(() => props.restore, (numbers) => {
  if (!numbers) return
  games.value = [[...numbers]]
  count.value = 1
}, { immediate: true })

function generate() {
  try {
    games.value = generateLottoGames(count.value, selection.value, spread.value)
    games.value.forEach((numbers) => emit('remember', [...numbers]))
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : '번호를 생성하지 못했습니다.', 'error')
  }
}
function regenerate(index: number) {
  try {
    const numbers = regenerateLottoGame(games.value, index, selection.value, spread.value)
    games.value[index] = numbers
    emit('remember', [...numbers])
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : '번호를 생성하지 못했습니다.', 'error')
  }
}
function copyGame(index: number) {
  const numbers = games.value[index]
  if (numbers) emit('copy', `게임 ${index + 1}: ${formatLotto(numbers)}`)
}
</script>

<template>
  <div class="space-y-6">
    <section class="relative overflow-clip rounded-[30px] bg-emerald-800 px-5 py-7 text-white shadow-xl shadow-emerald-950/15 sm:px-8 sm:py-9">
      <div class="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[42px] border-white/5" aria-hidden="true"></div>
      <div class="pointer-events-none absolute -bottom-28 right-28 size-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true"></div>
      <div class="relative">
        <p class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-100">✦ 오늘의 번호</p>
        <h2 class="mt-5 max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-4xl">나만의 행운 조합을<br />만들어 보세요.</h2>
        <p class="mt-3 max-w-md text-sm leading-6 text-emerald-100/85">숫자를 고르거나, 아무 조건 없이 시작해도 좋아요. 무작위로 고르거나 여러 게임의 번호를 분산할 수 있어요.</p>
        <div class="mt-7 rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm sm:p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-emerald-100">몇 게임을 만들까요?</span>
            <span v-if="hasConditions" class="text-[11px] font-semibold text-amber-200">고정 {{ selection.fixed.length }} · 제외 {{ selection.excluded.length }}</span>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="생성할 게임 수">
            <button v-for="option in ([1, 3, 5] as const)" :key="option" type="button" class="count-button" :class="count === option ? 'count-button-active' : ''" :aria-pressed="count === option" @click="count = option">{{ option }}게임</button>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="로또 생성 방식" aria-describedby="lotto-mode-help">
            <button type="button" class="count-button" :class="!spread ? 'count-button-active' : ''" :aria-pressed="!spread" @click="spread = false">기본 무작위</button>
            <button type="button" class="count-button" :class="spread ? 'count-button-active' : ''" :aria-pressed="spread" @click="spread = true">게임 간 분산</button>
          </div>
          <p id="lotto-mode-help" class="mt-3 text-xs leading-5 text-emerald-100" aria-live="polite">{{ spread ? '고정·제외 조건을 지키며 덜 사용한 번호부터 골라요. 1게임에는 분산 효과가 없고, 조건이 좁으면 번호가 겹칠 수 있어요.' : '조건에 맞는 조합을 무작위로 만들고, 완전히 같은 게임은 제외해요.' }} 당첨 확률을 높이는 기능은 아닙니다.</p>
          <button type="button" class="primary-button mt-4 w-full" @click="generate"><Dices :size="21" aria-hidden="true" /> 번호 생성하기</button>
        </div>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div class="min-w-0 space-y-4">
        <div class="flex items-center justify-between gap-2 px-1">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white">생성 결과</h2>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">1~45 중 중복 없는 숫자 6개</p>
          </div>
          <button v-if="games.length" type="button" class="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30" @click="generate"><RefreshCw :size="15" aria-hidden="true" /> 전체 다시 생성</button>
        </div>
        <div v-if="games.length" class="space-y-3" aria-live="polite">
          <LottoGame v-for="(numbers, index) in games" :key="`${index}-${numbers.join('-')}`" :numbers="numbers" :index="index" @regenerate="regenerate(index)" @copy="copyGame(index)" @save="emit('save', [...numbers])" />
        </div>
        <div v-else class="grid min-h-60 place-items-center rounded-[26px] border border-dashed border-slate-300 bg-white/60 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <div>
            <div class="mx-auto flex justify-center gap-1.5" aria-hidden="true"><span v-for="n in 6" :key="n" class="grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-300 dark:bg-slate-700 dark:text-slate-500">?</span></div>
            <p class="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">번호가 여기에 나타나요</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">위의 번호 생성 버튼을 눌러 시작하세요.</p>
          </div>
        </div>
      </div>

      <div class="lg:sticky lg:top-5">
        <button type="button" class="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 lg:hidden" :aria-expanded="selectorOpen" aria-controls="number-selector" @click="selectorOpen = !selectorOpen"><span class="flex items-center gap-2"><SlidersHorizontal :size="18" aria-hidden="true" /> 번호 고정 · 제외</span><ChevronDown :size="18" :class="selectorOpen ? 'rotate-180' : ''" aria-hidden="true" /></button>
        <div id="number-selector" :class="selectorOpen ? 'mt-3' : 'hidden lg:block'">
          <LottoNumberSelector :selection="selection" @change="selection = $event" @error="emit('notify', $event, 'error')" />
        </div>
      </div>
    </div>
  </div>
</template>

