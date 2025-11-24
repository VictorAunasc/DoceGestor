<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <div :class="['p-6 pb-2', $props.class]">
    <slot />
  </div>
</template>
