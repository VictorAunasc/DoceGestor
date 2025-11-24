<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <h3 :class="['text-xl font-semibold', $props.class]"><slot /></h3>
</template>
