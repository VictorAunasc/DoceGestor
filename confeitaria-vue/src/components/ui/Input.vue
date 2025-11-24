<script setup lang="ts">
import { computed, useAttrs, defineOptions } from 'vue';
defineOptions({ inheritAttrs: false }); // garante controle total do class/attrs

const props = defineProps<{
  modelValue?: string | number
  id?: string
  type?: string
  placeholder?: string
  required?: boolean
}>();

const emit = defineEmits<{ 'update:modelValue':[any] }>();
const value = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
});

const attrs = useAttrs();
</script>

<template>
  <input
    v-bind="attrs"
    :id="props.id"
    :type="props.type || 'text'"
    v-model="value"
    :placeholder="props.placeholder"
    :required="props.required"
    :class="[
      // base Figma
      'h-11 w-full rounded-xl bg-gray-100 border border-gray-200',
      'px-3 py-2 text-gray-800 placeholder-gray-400',
      'outline-none focus:ring-2 focus:ring-pink-500/25 focus:border-pink-500',
      // classes vindas do pai (ex.: pl-10)
      attrs.class
    ]"
  />
</template>
