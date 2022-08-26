<template>
  <div id="app">
    <div class="container">
      <header class="header">
        <div class="title">
          <h1>Decision game</h1>
          <h2 v-if="progress">
            Game {{ progress.number }}/{{ progress.count }}
          </h2>
        </div>
        <aside class="scorecard">
          <header>
            <span class="name">Players</span>
          </header>
          <div
            v-for="p in players"
            :key="p.id"
            :class="p === me ? 'myself player' : 'player'"
          >
            <span class="name">{{ p.name }}</span>
            <span class="score">{{ p.score }}</span>
          </div>
        </aside>
      </header>
      <div class="camera flex">
        <WebCam ref="camera-local" class="webcam" :token="ov_token" />
      </div>
      <div class="gameboard container">
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
        <div v-if="stage === 'Reveal moves'" class="reveal reveal-moves flex">
          <div
            v-for="(m, i) in moves"
            :key="i"
            :class="
              m.player === me
                ? 'myself player-move flex-col'
                : 'player-move flex-col'
            "
          >
            <span class="player-name">{{ m.player.name }}</span>
            <span class="player-selected">selected</span>
            <MoveButton :decision-label="m.label" disabled="disabled" />
          </div>
        </div>
        <div
          v-if="stage === 'Reveal payoff'"
          class="reveal reveal-payoffs flex"
        >
          <div
            v-for="(p, i) in payoffs"
            :key="i"
            :class="
              p.player === me
                ? 'myself player-payoff flex-col'
                : ' player-payoff flex-col'
            "
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
    <footer>
      <h3 v-if="stage">{{ stage }}</h3>
    </footer>
  </div>
</template>

<script>
import MoveButton from "@/components/MoveButton.vue";
import WebCam from "@/components/WebCam.vue";
export default {
  name: "App",
  components: {
    MoveButton,
    WebCam,
  },
  data: function () {
    return {
      newMessage: null,
      messages: [],
      typing: false,
      ready: false,
      info: [],
      connections: 0,

      game_state: {},

      localStream: null,
      remoteStream: null,
      localPeerConnection: null,
      remotePeerConnection: null,
    };
  },

  sockets: {
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
  },

  watch: {
    newMessage(value) {
      value
        ? this.$socket.emit("typing", this.username)
        : this.$socket.emit("stopTyping");
    },
  },

  methods: {
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
          ""
        );
      } catch (e) {
        return "";
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
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  padding: 3em 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100vh;
  & > .container {
    display: grid;
    grid-template-rows: 20% 20% 60%;
    grid-template-columns: 1fr;
    flex-grow: 1;
  }
}
.myself {
  font-weight: bold;
}
.flex {
  display: flex;
  justify-content: space-between;
}
.flex-col {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.header {
  display: grid;
  grid-template-columns: 2fr 1fr;
  .title {
  }
  .scorecard {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 1em;
    background-color: gainsboro;
    .player {
      display: grid;
      grid-template-columns: 4fr 1fr;
      width: 100%;
      .name {
        text-align: left;
        text-overflow: clip;
        overflow: hidden;
      }
      .score {
        text-align: right;
      }
    }
  }
}
.camera {
  .webcam {
    height: 150px;
    width: 150px;
  }
}
.gameboard {
  background-color: aliceblue;
  height: 100%;
  margin: 1em auto;
  align-self: center;
  max-width: 700px;
  justify-content: center;

  .description-wrapper {
    text-align: left;
    .description {
      p {
        padding: 0.5em 1em;
      }
    }
    .description.prompt {
      text-align: center;
    }
  }
  .moves {
    padding: 1em;
    display: flex;
    justify-content: space-between;
  }
  .reveal {
    padding: 0 1em 1em 1em;
  }
  .reveal-moves {
    .player-move {
      .move {
        background-color: inherit;
        color: inherit;
        border: none;
      }
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
</style>
