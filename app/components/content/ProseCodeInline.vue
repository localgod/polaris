<template>
  <code :class="$props.class">
    <slot />
  </code>
</template>

<script setup lang="ts">
defineProps({
  class: {
    type: String,
    default: ''
  }
})
</script>
