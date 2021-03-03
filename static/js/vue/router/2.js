const app = Vue.createApp({
  template: "<div>组件 A</div>",
  data() {},
});

app.component("comp-a", {
  template: "component a",
});

var router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes: [{ path: "/", redirect: "/a" }],
});

app.use(ElementPlus).use(router).mount("#app");
