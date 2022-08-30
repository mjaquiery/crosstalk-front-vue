<template>
  <div class="app">
    <aside class="scorecard">
      <div v-if="progress">
        <p class="name">Game</p>
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
    <aside class="remote-camera" ref="remote_camera"></aside>
    <aside class="game-room-picker" v-if="!me">
      <o-input v-model="game_room" />
      <o-button @click="join_game" :disabled="!game_room">Join</o-button>
    </aside>
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
        >
          <MoveButton
            v-for="(d, i) in decision_labels"
            :key="i"
            :decision-label="d"
            :value="i"
            :disabled="!allow_player_move"
            @makeMove="makeMove"
          />
        </div>
        <div v-if="stage === 'Reveal moves'" class="reveal reveal-moves">
          <div
            v-for="(m, i) in moves"
            :key="i"
            :class="
              m.player === me
                ? 'myself player-move'
                : 'player-move'
            "
          >
            <span class="player-name">{{ m.player.name }}</span>
            <span class="player-selected">&nbsp;selected</span>
            <MoveButton :decision-label="m.label" disabled="disabled" />
          </div>
        </div>
        <div
          v-if="stage === 'Reveal payoff'"
          class="reveal reveal-payoffs"
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
          <div
            v-if="resultString"
            v-html="resultString"
            class="result-string"
          ></div>
        </div>
      </div>
    </div>
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
      newMessage: null,
      messages: [],
      typing: false,
      ready: false,
      info: [],
      connections: 0,
      game_room: "Test game",
      game_state: {},
    };
  },

  sockets: {
    error: function (err) {
      console.error(err);
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
    },
    chatMessage: (data) => {
      this.messages.push({
        message: data.message,
        type: 1,
        user: data.user,
      });
    },
    typing: (data) => (this.typing = data),
    stopTyping: () => (this.typing = false),
    connections: (data) => (this.connections = data),
  },

  created() {
    window.onbeforeunload = () => {
      this.$socket.emit("leave", this.username);
    };

    // For dev purposes, attempt to join game immediately.
    this.join_game();
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
      this.$socket.emit("joinGame", {
        game_room: this.game_room,
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
  grid-template-rows: 10% 30% 60%;
  grid-column-gap: 1rem;
  grid-row-gap: 1%;
  height: 100vh;
  width: 100%;
  max-width: breakpoint-max(md);

  > .scorecard {
    grid-row: 1;
    grid-column: 1;
    padding-left: 0.5em;
    font-size: 0.8em;
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

video {
  max-width: 100%;
  max-height: 100%;
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
  background-color: aliceblue;
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
    }
    .moves {
      padding: 1em;
      display: flex;
      justify-content: space-evenly;
      width: 100%;
    }
    .reveal-moves {
      display: flex;
      width: 100%;
      justify-content: space-evenly;
      .player-move {
        .move {
          background-color: inherit;
          color: inherit;
          border: none;
        }
      }
      .player-selected {
        font-weight: normal;
      }
    }
    .reveal-payoffs {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      .result-string {
        grid-row: 1;
        grid-column: 2;
        align-self: center;
      }
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
