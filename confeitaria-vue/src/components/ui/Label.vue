<script setup lang="ts">
defineProps<{ for?: string; class?: string }>();
</script>

<template>
  <label :for="for" :class="['text-sm mb-1 block', $props.class]">
    <slot />
  </label>
</template>
