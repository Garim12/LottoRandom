<script setup lang="ts">
import type { PensionSet } from '../../types/lottery'
import PensionTicket from './PensionTicket.vue'
defineProps<{ set: PensionSet }>()
</script>

<template>
  <div class="space-y-2" aria-label="1조부터 5조까지 같은 번호인 세트">
    <PensionTicket v-for="ticket in set.tickets" :key="ticket.group" :ticket="ticket" compact />
  </div>
</template>
