<script setup lang="ts">
import { useAttrs, defineOptions } from 'vue';
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const props = withDefaults(defineProps<{ type?: 'button'|'submit'|'reset'; disabled?: boolean }>(), {
  type: 'button', disabled: false
});
</script>

<template>
  <button
    v-bind="attrs"
    :type="props.type"
    :disabled="props.disabled"
    :class="[
      'h-11 w-full inline-flex items-center justify-center rounded-xl',
      'px-4 font-medium tracking-wide',
      'bg-pink-600 hover:bg-pink-500 text-white transition',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      attrs.class
    ]"
  >
    <slot />
  </button>
</template>
