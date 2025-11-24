<script setup lang="ts">
import { inject, useAttrs, defineOptions } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ value: string }>();
const attrs = useAttrs();

const tabs = inject<{ value: any; setValue: (v: string) => void }>('tabsCtx')!;
const isActive = () => tabs.value?.value === props.value;
</script>

<template>
  <button
    v-bind="attrs"
    role="tab"
    type="button"
    :data-state="isActive() ? 'active' : 'inactive'"
    class="tab-trigger"
    @click="tabs.setValue(props.value)"
  >
    <slot />
  </button>
</template>
