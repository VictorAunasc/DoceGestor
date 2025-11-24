<script setup lang="ts">
const props = defineProps<{
  title: string
  qty: string
  client: string
  price: string
  date: string
}>()
</script>

<template>
  <div class="list-row">
    <div class="min-w-0">
      <div class="text-sm text-gray-900">{{ title }}</div>
      <div class="text-xs text-gray-500">{{ qty }} – {{ client }}</div>
    </div>
    <div class="text-right">
      <div class="text-sm font-medium text-gray-900">{{ price }}</div>
      <div class="text-[11px] text-gray-500">{{ date }}</div>
    </div>
  </div>
</template>
