<script setup lang="ts">
import type { FunctionalComponent } from 'vue'

const props = defineProps<{
  title: string
  value: string
  subtitle?: string
  subtitleClass?: string
  icon?: FunctionalComponent
}>()
</script>

<template>
  <div class="card">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-gray-600">{{ title }}</p>
        <h3 class="text-2xl font-semibold mt-2 text-gray-900">{{ value }}</h3>
        <p class="text-xs mt-1" :class="subtitleClass || 'text-gray-500'">{{ subtitle }}</p>
      </div>
      <component v-if="icon" :is="icon" class="size-5 text-gray-400" />
    </div>
  </div>
</template>
