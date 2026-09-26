<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUpRight, Heart, History } from 'lucide-vue-next'
import AppHeader from './components/common/AppHeader.vue'
import ConfirmDialog from './components/common/ConfirmDialog.vue'
import LotteryTabs from './components/common/LotteryTabs.vue'
import SavedNumbers from './components/common/SavedNumbers.vue'
import ToastContainer from './components/common/ToastContainer.vue'
import LottoGenerator from './components/lotto/LottoGenerator.vue'
import PensionGenerator from './components/pension/PensionGenerator.vue'
import { useLotteryStorage, createLottoEntry, createPensionEntry, createPensionSetEntry } from './composables/useLotteryStorage'
import { useTheme } from './composables/useTheme'
import { useToast } from './composables/useToast'
import { copyText } from './utils/clipboard'
import type { LotteryTab, PensionTicket, StoredLottery } from './types/lottery'

const tab = ref<LotteryTab>('lotto')
const drawer = ref<'favorites' | 'history' | null>(null)
const pendingClear = ref<'favorites' | 'history' | null>(null)
const lottoRestore = ref<number[] | null>(null)
const pensionRestore = ref<StoredLottery | null>(null)
const storage = useLotteryStorage()
const theme = useTheme()
const toast = useToast()
const drawerItems = computed(() => drawer.value === 'favorites' ? storage.favorites.value : storage.history.value)

function save(item: StoredLottery) {
  const added = storage.save(item)
  toast.show(added ? '번호를 저장했습니다.' : '이미 저장한 번호입니다.', added ? 'success' : 'info')
}
async function copy(text: string) {
  const copied = await copyText(text)
  toast.show(copied ? '번호를 복사했습니다.' : '복사하지 못했습니다. 브라우저 권한을 확인해 주세요.', copied ? 'success' : 'error')
}
function restore(item: StoredLottery) {
  if (item.type === 'lotto') {
    tab.value = 'lotto'
    lottoRestore.value = [...item.numbers]
  } else {
    tab.value = 'pension'
    pensionRestore.value = { ...item }
  }
  drawer.value = null
  toast.show('번호를 불러왔습니다.', 'success')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function removeFavorite(id: string) {
  storage.removeFavorite(id)
  toast.show('저장한 번호를 삭제했습니다.', 'success')
}
function clearConfirmed() {
  if (pendingClear.value === 'favorites') storage.clearFavorites()
  if (pendingClear.value === 'history') storage.clearHistory()
  pendingClear.value = null
  toast.show('목록을 모두 삭제했습니다.', 'success')
}
</script>

<template>
  <div id="top" class="min-h-screen">
    <AppHeader :dark="theme.dark.value" :favorites-count="storage.favorites.value.length" :history-count="storage.history.value.length" @toggle-theme="theme.toggle" @open-favorites="drawer = 'favorites'" @open-history="drawer = 'history'" />
    <main class="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p class="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-300">Lucky number studio</p><h1 class="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">가볍게 고르는 오늘의 번호</h1></div>
        <p class="hidden max-w-[18rem] text-right text-xs leading-5 text-slate-500 dark:text-slate-400 sm:block">조건을 골라 나만의 조합을 만들고,<br />마음에 드는 번호를 보관하세요.</p>
      </div>
      <LotteryTabs v-model="tab" class="mb-6 max-w-lg" />
      <section v-if="tab === 'lotto'" id="lotto-panel" role="tabpanel" aria-label="로또 6/45 생성기">
        <LottoGenerator :restore="lottoRestore" @copy="copy" @save="(numbers: number[]) => save(createLottoEntry(numbers))" @remember="(numbers: number[]) => storage.remember(createLottoEntry(numbers))" @notify="(message: string, tone: 'error' | 'info') => toast.show(message, tone)" />
      </section>
      <section v-else id="pension-panel" role="tabpanel" aria-label="연금복권 720+ 생성기">
        <PensionGenerator :restore="pensionRestore" @copy="copy" @save-single="(ticket: PensionTicket) => save(createPensionEntry(ticket))" @save-set="(number: string) => save(createPensionSetEntry(number))" @remember-single="(ticket: PensionTicket) => storage.remember(createPensionEntry(ticket))" @remember-set="(number: string) => storage.remember(createPensionSetEntry(number))" @notify="(message: string) => toast.show(message, 'error')" />
      </section>
      <section class="mt-9 grid gap-3 sm:grid-cols-2" aria-label="내 번호 보관함">
        <button type="button" class="group flex items-center justify-between rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800" @click="drawer = 'favorites'"><span class="flex items-center gap-3"><span class="grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300"><Heart :size="20" aria-hidden="true" /></span><span><strong class="block text-sm font-extrabold text-slate-900 dark:text-white">저장한 번호</strong><small class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">마음에 드는 조합 {{ storage.favorites.value.length }}개</small></span></span><ArrowUpRight :size="18" class="text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></button>
        <button type="button" class="group flex items-center justify-between rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800" @click="drawer = 'history'"><span class="flex items-center gap-3"><span class="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300"><History :size="20" aria-hidden="true" /></span><span><strong class="block text-sm font-extrabold text-slate-900 dark:text-white">최근 생성 기록</strong><small class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">최근 번호 {{ storage.history.value.length }}개</small></span></span><ArrowUpRight :size="18" class="text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></button>
      </section>
    </main>
    <footer class="border-t border-slate-200/80 bg-white/60 px-4 py-7 dark:border-slate-800 dark:bg-slate-900/50">
      <div class="mx-auto max-w-6xl text-xs leading-6 text-slate-500 dark:text-slate-400"><p class="font-semibold text-slate-700 dark:text-slate-300">책임 있는 이용 안내</p><p>본 사이트는 무작위 번호 생성 도구입니다. 당첨 번호를 예측하거나 당첨을 보장하지 않습니다. 모든 번호 조합의 당첨 가능성은 동일합니다.</p><p>복권 구매는 관련 법령의 연령 제한을 따릅니다. 미성년자는 복권을 구매할 수 없습니다.</p></div>
    </footer>
    <SavedNumbers v-if="drawer" :kind="drawer" :items="drawerItems" @close="drawer = null" @copy="copy" @load="restore" @remove="removeFavorite" @clear="pendingClear = drawer" />
    <ConfirmDialog :open="pendingClear !== null" :title="pendingClear === 'favorites' ? '저장한 번호를 모두 삭제할까요?' : '최근 생성 기록을 모두 삭제할까요?'" description="삭제한 목록은 되돌릴 수 없습니다." @confirm="clearConfirmed" @cancel="pendingClear = null" />
    <ToastContainer :toasts="toast.toasts.value" @dismiss="toast.dismiss" />
  </div>
</template>
