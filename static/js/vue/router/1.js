var app = Vue.createApp({
  template: `
<el-button :type="focus === 0 ? 'primary' : undefined" @click="test1">测试一</el-button>
<el-button :type="focus === 1 ? 'primary' : undefined" @click="test2">测试二</el-button>
<br>
<router-view></router-view>
`,
  data() {
    return {
      focus: 0,
    };
  },
  methods: {
    test1() {
      this.focus = 0;
      this.$router.push({ name: "a" });
    },
    test2() {
      this.focus = 1;
      this.$router.push({ name: "b" });
    },
  },
});
app.component("comp-a", {
  template: "compnent a",
});
app.component("comp-b", {
  template: "component b",
});

var router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/a",
    },
    {
      path: "/a",
      name: "a",
      component: app.component("comp-a"),
    },
    {
      path: "/b",
      name: "b",
      component: app.component("comp-b"),
    },
  ],
});

app.use(ElementPlus).use(router).mount("#app");
