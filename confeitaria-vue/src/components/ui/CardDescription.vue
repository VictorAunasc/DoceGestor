<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <p :class="['text-sm text-gray-400', $props.class]"><slot /></p>
</template>
