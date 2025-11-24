<script setup lang="ts">
import { useAttrs, defineOptions } from 'vue';
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
</script>

<template>
  <div
    v-bind="attrs"
    :class="[
      'grid grid-cols-2 gap-1 rounded-full p-1',
      'bg-gray-200 border border-gray-200',
      'w-[520px] max-w-full mx-auto',
      attrs.class
    ]"
  >
    <slot />
  </div>
</template>
