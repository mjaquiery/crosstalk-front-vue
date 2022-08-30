<template>
  <div class="webcam">
  </div>
</template>

<script>
import { OpenVidu } from "openvidu-browser";
export default {
  name: "WebCamManager",
  props: {
    publisher: { type: Object, required: false, default: null },
    subscriber: { type: Object, required: false, default: null },
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
      this.session = this.OV.initSession();
      this.session.on("streamCreated", (event) => {
        console.log(`Showing subscribed stream`, event, this.subscriber);
        this.session.subscribe(event.stream, this.subscriber);
      });
      this.session.connect(this.token).then(() => {
        console.info(`Publishing video to`, this.publisher);
        this.session.publish(
          this.OV.initPublisher(this.publisher, { publishAudio: false })
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
