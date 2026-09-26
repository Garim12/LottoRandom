<script setup lang="ts">
import { Clover, Heart, History } from 'lucide-vue-next'
import ThemeToggle from './ThemeToggle.vue'
import { SITE } from '../../config'

defineProps<{ dark: boolean; favoritesCount: number; historyCount: number }>()
defineEmits<{ toggleTheme: []; openFavorites: []; openHistory: [] }>()
</script>

<template>
  <header class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
    <a href="#top" class="group flex min-w-0 items-center gap-3" aria-label="행운번호 생성기 맨 위로">
      <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/15 transition group-hover:-rotate-6">
        <Clover :size="24" :stroke-width="2.4" aria-hidden="true" />
      </span>
      <span class="min-w-0">
        <strong class="block truncate text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">{{ SITE.name }}</strong>
        <span class="block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">{{ SITE.subtitle }}</span>
      </span>
    </a>
    <nav class="flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label="사이트 메뉴">
      <button type="button" class="icon-button relative" aria-label="저장한 번호 보기" @click="$emit('openFavorites')">
        <Heart :size="19" aria-hidden="true" />
        <span v-if="favoritesCount" class="count-dot">{{ favoritesCount > 99 ? '99+' : favoritesCount }}</span>
      </button>
      <button type="button" class="icon-button relative" aria-label="최근 생성 기록 보기" @click="$emit('openHistory')">
        <History :size="19" aria-hidden="true" />
        <span v-if="historyCount" class="count-dot">{{ historyCount > 99 ? '99+' : historyCount }}</span>
      </button>
      <ThemeToggle :dark="dark" @toggle="$emit('toggleTheme')" />
    </nav>
  </header>
</template>
