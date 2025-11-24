<script setup lang="ts">
import { provide, ref, computed } from 'vue';

const props = defineProps<{ defaultValue?: string }>();
const selected = ref(props.defaultValue || '');

function setValue(v: string) {
  selected.value = v;
}

provide('tabsCtx', {
  value: computed(() => selected.value),
  setValue,
});
</script>

<template>
  <div><slot /></div>
</template>
