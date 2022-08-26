import { createApp } from "vue";
import { createPinia } from "pinia";
import VueSocketIO from "vue-socket.io";
import App from "./App.vue";

import "./assets/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(
  new VueSocketIO({
    debug: false,
    connection: `https://${window.location.hostname}:3000`,
  })
);

app.mount("#app");
