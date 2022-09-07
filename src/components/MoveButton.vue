<template>
  <button
    class="move"
    :class="activated ? 'activated' : 'not-activated'"
    :value="value"
    @click="$emit('makeMove', value)"
  >
    <span class="icon" v-html="decisionLabel.icon"></span>
    <span class="label">{{ decisionLabel.text }}</span>
  </button>
</template>

<script>
export default {
  name: "move-button",
  props: {
    decisionLabel: { type: Object, required: true },
    value: { type: Number, required: false, default: -Infinity },
    activated: { type: Boolean, required: false, default: false },
  },
};
</script>

<style scoped lang="scss">
.move {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: lightgrey;
  border-radius: 1em;
  padding: 1em;
  border: none;
  cursor: pointer;
  width: min(200px, 33vw);
  height: min(200px, 33vw);
  .icon {
    font-size: 4em;
  }
  .label {
    font-size: 1.5em;
    font-weight: bold;
  }
}
.move:disabled {
  cursor: wait;
}
.move.not-activated:not(:hover),
.move.not-activated:disabled {
  background-color: inherit;
}
</style>
