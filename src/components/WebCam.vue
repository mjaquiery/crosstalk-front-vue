<template>
  <div class="webcam">
    <div class="publisher" ref="publisher"><h3>YOU</h3></div>
    <div class="subscriber" ref="subscriber"><h3>OTHERS</h3></div>
  </div>
</template>

<script>
import { OpenVidu } from "openvidu-browser";
export default {
  name: "WebCam",
  props: {
    token: { type: String, required: false },
  },
  data: function () {
    return {
      OV: new OpenVidu(),
      session: null,
    };
  },
  methods: {
    connect() {
      if (!this.token) return;
      if (!this.session) {
        this.session = this.OV.initSession();
        this.session.on("streamCreated", (event) => {
          this.session.subscribe(event.stream, this.$refs.subscriber);
        });
      }
      this.session.connect(this.token).then(() => {
        this.session.publish(
          this.OV.initPublisher(this.$refs.publisher, { publishAudio: false })
        );
      });
    },
    leaveSession() {
      if (!this.session) {
        return;
      }
      this.session.disconnect();
    },
  },
  watch: {
    token() {
      this.connect();
    },
  },
  created() {
    window.onbeforeunload = () => {
      if (this.session) this.session.disconnect();
    };
  },
};
</script>

<style scoped lang="scss">
.webcam {
  font-size: 0.5em;
  z-index: 10;
}
</style>
<style lang="scss">
.webcam video {
  max-width: 100%;
}
</style>
