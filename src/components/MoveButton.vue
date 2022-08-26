<template>
  <button
      class="move"
      :value="value"
      @click="$emit('makeMove', value)"
  >
    <span class="icon" v-html="decisionLabel.icon"></span>
    <span class="label">{{decisionLabel.text}}</span>
  </button>
</template>

<script>
export default {
  name: "move-button",
  props: {
    decisionLabel: {type: Object, required: true},
    value: {type: Number, required: false, default: -Infinity}
  }
}
</script>

<style scoped lang="scss">

.move {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  .icon {
    font-size: 6em;
  }
}
</style>