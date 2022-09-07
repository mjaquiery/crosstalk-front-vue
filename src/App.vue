<template>

  <div v-if="!game_over" class="app">

    <aside class="scorecard">
      <div v-if="progress">
        <p class="name">Round</p>
        <p class="score">{{ progress.number }}/{{ progress.count }}</p>
      </div>

      <div
        v-for="(p, i) in players"
        :key="i"
        :class="p === me ? 'myself' : ''"
        class="player"
      >
        <p class="name">{{ p.name }}</p>
        <p class="score">{{ p.score }}</p>
      </div>
    </aside>

    <aside class="local-camera" ref="local_camera">
      <div
        v-if="$refs.webcam_manager && $refs.webcam_manager.session"
        class="mask"
      >
        <p>View your video</p>
      </div>
    </aside>

    <o-button @click="menu_open = !menu_open" class="menu">&#9776;</o-button>

    <aside class="remote-camera" ref="remote_camera"></aside>

    <div class="gameboard-wrapper">
      <div class="gameboard">
        <div
          v-if="stage === 'Initial presentation'"
          class="description"
          v-html="description"
        ></div>
        <div
          class="description prompt"
          v-if="stage === 'Player moves in progress'"
          v-html="prompt"
        ></div>
        <div
          v-if="
            decision_labels.length === 2 && stage === 'Player moves in progress'
          "
          class="moves"
          :class="`moved-${(my_move !== null).toString()}`"
        >
          <MoveButton
            v-for="(d, i) in decision_labels"
            :key="i"
            :decision-label="d"
            :value="i"
            :activated="my_move === i"
            :disabled="!allow_player_move || my_move !== null"
            @makeMove="makeMove"
          />
        </div>
        <div v-if="stage === 'Reveal moves'" class="reveal reveal-moves">
          <div class="player-move">
            <span class="player-name">{{ moves.find(m => m.player !== me).player.name }}</span>
            <span class="player-selected">&nbsp;selected</span>
            <MoveButton :decision-label="moves.find(m => m.player !== me).label" disabled="disabled" />
          </div>
        </div>
        <div
          v-if="stage === 'Reveal payoff' && resultString"
          class="reveal reveal-payoffs result-string"
          v-html="resultString"
        ></div>
        <div
          v-if="stage === 'Reveal payoff'"
          class="reveal reveal-payoffs outcomes"
        >
          <div
            v-for="(p, i) in payoffs"
            :key="i"
            class="player-payoff"
            :class="p.player === me ? 'myself' : ''"
          >
            <span class="player-name">{{ p.player.name }}</span>
            <span class="payoff-name">{{ p.label }}</span>
            <span class="payoff-value">({{ p.value }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="app final-scores">
    <h1>Final scores:</h1>
    <div class="scores-wrapper">
      <div
        v-for="(p, i) in players"
        :key="i"
        :class="p === me ? 'myself' : ''"
        class="player"
      >
        <p class="name">{{ p.name }}</p>
        <p class="score">{{ p.score }}</p>
      </div>
    </div>
    <o-button expanded @click="menu_open = !menu_open">Play again?</o-button>
  </div>

  <footer>
    <h3 v-if="stage">{{ stage }}</h3>
  </footer>

  <WebCamManager
    class="webcam"
    ref="webcam_manager"
    :token="ov_token"
    :publisher="$refs.local_camera"
    :subscriber="$refs.remote_camera"
  />

  <o-modal
    :active="menu_open || !me"
    class="menu modal container-md"
    @close="menu_open = false"
  >
    <div class="menu-wrapper">
      <h1>Connect to a Crosstalk Game</h1>
      <div class="menu-inputs">
        <div class="name-picker">
          <o-input
            v-model="player_name"
            maxlength="24"
            :has-counter="true"
            placeholder="Player name"
          />
        </div>
        <div class="game-room-picker">
          <o-input
            v-model="game_room"
            @keydown="(e) => (e.key === 'Enter' ? join_game() : null)"
            placeholder="Game room"
          />
          <o-button @click="join_game" :disabled="!game_room" expanded
          >Join</o-button
          >
        </div>
      </div>
    </div>
  </o-modal>

</template>

<script>
import MoveButton from "@/components/MoveButton.vue";
import WebCamManager from "@/components/WebCamManager.vue";

export default {
  name: "App",
  components: {
    MoveButton,
    WebCamManager,
  },
  data: function () {
    return {
      game_room: `Test${(10 + Math.random() * 90).toFixed(0)}`,
      player_name: "",
      game_state: {},
      game_over: false,
      menu_open: false,
      my_move: false,
    };
  },

  sockets: {
    error: function (err) {
      console.error(err);
    },
    warning: function (warn) {
      console.warn(warn);
    },
    joined: function (data) {
      this.info.push({
        username: data,
        type: "joined",
      });

      setTimeout(() => (this.info = []), 5000);
    },
    leave: function (data) {
      this.info.push({
        username: data,
        type: "left",
      });

      setTimeout(() => (this.info = []), 5000);
    },
    gameStateUpdate: function (data) {
      const gamestate = JSON.parse(data);
      console.log(gamestate);
      this.game_state = gamestate;
      this.my_move = null;
    },
    gameOver: function () {
      this.game_over = true;
    },
  },

  created() {
    window.onbeforeunload = () => {
      this.$socket.emit("leave", this.username);
    };

    // For dev purposes, attempt to join game immediately.
    // this.join_game();
  },

  watch: {
    newMessage(value) {
      value
        ? this.$socket.emit("typing", this.username)
        : this.$socket.emit("stopTyping");
    },
  },

  methods: {
    join_game() {
      console.debug("Initiate join game request");
      this.menu_open = false;
      this.$socket.emit("joinGame", {
        game_room: this.game_room,
        player_name: this.player_name,
        network_token: this.network_token,
      });
    },
    send() {
      this.messages.push({
        message: this.newMessage,
        type: 0,
        user: "Me",
      });

      this.$socket.emit("chat-message", {
        message: this.newMessage,
        user: this.me.name,
      });
      this.newMessage = null;
    },
    makeMove(value) {
      this.$socket.emit("makeMove", value);
      this.my_move = value;
    },
  },
  computed: {
    network_token() {
      const key = "network-token";
      const value = localStorage.getItem(key);
      if (value) {
        return value;
      }
      localStorage.setItem(
        key,
        `crosstalk_${(
          Math.random() *
          10 ** 16
        ).toFixed()}.${new Date().getTime()}`
      );
      return localStorage.getItem(key);
    },
    players() {
      try {
        return wrap(this.game_state.players, []);
      } catch (e) {
        return [];
      }
    },
    me() {
      try {
        return wrap(
          this.players.find((p) => p.you),
          null
        );
      } catch (e) {
        return null;
      }
    },
    them() {
      try {
        return wrap(
          this.players.find((p) => !p.you),
          null
        );
      } catch (e) {
        return null;
      }
    },
    ov_token() {
      try {
        return wrap(this.game_state.ov_token, "");
      } catch (e) {
        return "";
      }
    },
    progress() {
      try {
        const number = wrap(this.game_state.game.number);
        const count = wrap(this.game_state.game_count);
        if (number === null || count === null) {
          return null;
        }
        return { number, count };
      } catch (e) {
        return null;
      }
    },
    description() {
      try {
        return wrap(this.game_state.game.description, "");
      } catch (e) {
        return "";
      }
    },
    prompt() {
      try {
        return wrap(this.game_state.game.prompt, "");
      } catch (e) {
        return "";
      }
    },
    decision_labels() {
      try {
        return wrap(this.game_state.game.decision_labels, []).map((d) =>
          typeof d === "string" ? { label: d, icon: null } : d
        );
      } catch (e) {
        return [];
      }
    },
    stage() {
      try {
        return wrap(this.game_state.game.stage);
      } catch (e) {
        return null;
      }
    },
    moves() {
      try {
        const moves = this.game_state.game.moves.map((m) => {
          return {
            ...m,
            player: this.players.find((p) => p.index === m.player_index),
          };
        });
        moves.sort((a, b) => a.player_index > b.player_index);
        return moves;
      } catch (e) {
        return [];
      }
    },
    payoffs() {
      try {
        return this.game_state.game.payoffs.map((p, i) => {
          return {
            ...p,
            player: this.players.find((player) => player.index === i),
          };
        });
      } catch (e) {
        return [];
      }
    },
    resultString() {
      try {
        return this.game_state.game.resultString;
      } catch (e) {
        return "";
      }
    },
    // rules
    allow_player_move() {
      try {
        return this.game_state.game.rules["allow player move"] > 0;
      } catch (e) {
        return -1;
      }
    },
  },
};

function wrap(value, default_value = null) {
  return typeof value === "undefined" ? default_value : value;
}
</script>

<style lang="scss">
@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/mixins";

.app {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: max(100px, 10%) 1fr 2fr;
  grid-column-gap: 1rem;
  grid-row-gap: 1%;
  height: 100vh;
  width: 100%;
  max-width: breakpoint-max(md);

  > .scorecard {
    grid-row: 1;
    grid-column: 1;
    align-self: center;
    padding-left: 0.5em;
    font-size: 1.2em;
    > div {
      display: flex;
      justify-content: space-between;
    }
  }
  > .local-camera {
    grid-row: 1;
    grid-column: 2;
  }
  > .remote-camera {
    grid-row: 2;
    grid-column: 1 / 3;
    display: flex;
    justify-content: center;
  }
  > .gameboard-wrapper {
    grid-row: 3;
    grid-column: 1 / 3;
  }
}

.app.final-scores {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  .scores-wrapper {
    display: flex;
    flex-direction: column;
    width: 50%;
    height: 50%;
    justify-content: space-evenly;
    align-items: center;
    font-size: 2em;
    .player {
      width: 100%;
      display: flex;
      justify-content: space-between;
    }
  }
}

video {
  max-width: 100%;
  max-height: 100%;
}

button.menu {
  position: absolute;
  top: 0;
  --width: 2em;
  left: calc(100% - var(--width));
  width: var(--width);
  height: var(--width);
  z-index: 10;
  border: 0;
}

.menu-wrapper {
  width: min(400px, 75vw);
  padding: 1em;
  display: grid;
  grid-template-rows: auto 1fr;
  border-radius: 1em;
  h1 {
    font-size: 1.2em;
    font-weight: bold;
  }
  .menu-inputs {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    height: 100%;
  }
}

.myself {
  font-weight: bold;
}

.game-metadata {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}
.scorecard {
  .header p {
    font-weight: bold;
    font-size: 1.25em;
    background-color: rgba($secondary, 0.25);
  }
  p {
    margin-bottom: 0.1em;
  }
  .score {
    text-align: right;
  }
}
.local-camera {
  display: flex;
  justify-content: center;
  width: 100%;
  position: relative;
  .mask {
    width: 100%;
    height: 100%;
    background-color: black;
    position: absolute;
    z-index: 1;
    display: flex;
    place-content: center;
    justify-content: center;
    flex-direction: column;
    transition: background-color 1s;
    p {
      color: white;
      padding: 1em;
      margin: 0;
      text-align: center;
      transition: opacity 1s;
    }
  }
  .mask:hover,
  .mask:focus {
    background-color: transparent;
    p {
      opacity: 0;
    }
  }
}
.gameboard-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .gameboard {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    justify-content: space-evenly;
    align-items: center;
    .description {
      padding: 0.5em 1em;
    }
    .description.prompt {
      text-align: center;
      font-size: 1.4em;
    }
    .moves {
      padding: 1em;
      display: flex;
      justify-content: space-evenly;
      width: 100%;
    }
    .moves.moved-true {
      color: lightgrey;
    }
    .reveal-moves {
      display: flex;
      width: 100%;
      justify-content: space-evenly;
      .player-move {
        text-align: center;
        > span {
          font-size: 1.4em;
        }
        .move {
          background-color: inherit;
          color: inherit;
          border: none;
          span.label {
            font-weight: inherit;
          }
        }
      }
    }
    .result-string {
      grid-row: 1;
      grid-column: 2;
      align-self: center;
      text-align: center;
      font-size: 1.4em;
      font-weight: bold;
    }
    .outcomes {
      display: flex;
      width: 100%;
      justify-content: space-evenly;
      .player-payoff {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        span {
          margin: 0.5em;
        }
      }
      :not(.myself) {
      }
    }
  }
}
</style>
