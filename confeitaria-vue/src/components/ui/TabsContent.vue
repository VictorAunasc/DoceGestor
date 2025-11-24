<script setup lang="ts">
import { inject, computed } from 'vue';

const props = defineProps<{ value: string }>();
const tabs = inject<{ value: any }>('tabsCtx')!;
const visible = computed(() => tabs.value?.value === props.value);
</script>

<template>
  <div v-show="visible">
    <slot />
  </div>
</template>
