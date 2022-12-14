import { createApp } from "vue";
import { createPinia } from "pinia";
import VueSocketIO from "vue-socket.io";
import { Button, Input, Modal } from "@oruga-ui/oruga-next";
import App from "./App.vue";

import "bootstrap/dist/css/bootstrap.css";
import "@oruga-ui/oruga-next/dist/oruga.css";

const app = createApp(App);

app.use(createPinia());
app.use(
  new VueSocketIO({
    debug: false,
    connection: `https://${window.location.hostname}:3000`,
  })
);
app.use(Button).use(Input).use(Modal);

app.mount("#app");

import "bootstrap/dist/js/bootstrap.js";
