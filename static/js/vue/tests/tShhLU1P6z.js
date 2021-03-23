var id = "tShhLU1P6z";
var app_tShhLU1P6z = (function () {
  const { ref } = Vue;
  var app = Vue.createApp({
    template:
      '<el-button type="primary" @click="count++">测试++</el-button>: {{count}}',
    mounted() {
      log("option api mounted...");
    },
    setup() {
      const count = ref(0);
      Vue.onMounted(() => log("setup mounted"));
      Vue.onBeforeUpdate(function (arg) {
        console.log({ arg }, "setup before update");
      });
      Vue.onUpdated((...args) => log(args.concat("setup updated")));
      return { count };
    },
  });
  app.use(ElementPlus).mount("#" + id);
  return app;
})();
