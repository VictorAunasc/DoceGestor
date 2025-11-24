<script setup lang="ts">
import { useAttrs, defineOptions } from 'vue';
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
</script>

<template>
  <div
    v-bind="attrs"
    :class="[
      'rounded-2xl bg-white border border-black/10',
      'shadow-[0_8px_24px_rgba(0,0,0,.06)]',
      attrs.class
    ]"
  >
    <slot />
  </div>
</template>
