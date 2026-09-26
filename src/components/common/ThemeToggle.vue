<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
defineProps<{ dark: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button type="button" class="icon-button" :aria-label="dark ? '라이트 모드로 전환' : '다크 모드로 전환'" @click="$emit('toggle')">
    <Sun v-if="dark" :size="20" aria-hidden="true" />
    <Moon v-else :size="20" aria-hidden="true" />
  </button>
</template>
