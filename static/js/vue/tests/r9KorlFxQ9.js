var app_r9KorlFxQ9 = (function () {
  const {
    Suspense,
    render: domRender,
    h,
    ref,
    nodeOps,
    createApp,
    defineComponent,
    reactive,
    onMounted,
    onActivated,
    onDeactivated,
    onUnmounted,
    KeepAlive,
    watch,
  } = Vue;

  let logs = reactive([]);

  const One = defineComponent({
    setup() {
      const msg = reactive("one");
      let counts = {
        mounted: 0,
        created: 0,
        activated: 0,
        deactivated: 0,
        unmounted: 0,
      };
      onMounted(() => logs.push("one mounted called " + ++counts.mounted));
      onActivated(() =>
        logs.push("one activated called " + ++counts.activated)
      );
      onDeactivated(() =>
        logs.push("one deactivated called " + ++counts.deactivated)
      );
      onUnmounted(() =>
        logs.push("one unmounted called " + ++counts.unmounted)
      );
      logs.push("one created called " + ++counts.created);

      return () => h("div", msg);
    },
  });

  const Two = defineComponent({
    setup() {
      const msg = reactive("two");
      let counts = {
        mounted: 0,
        created: 0,
        activated: 0,
        deactivated: 0,
        unmounted: 0,
      };

      onMounted(() => logs.push("two mounted called " + ++counts.mounted));
      onActivated(() =>
        logs.push("two activated called " + ++counts.activated)
      );
      onDeactivated(() =>
        logs.push("two deactivated called " + ++counts.deactivated)
      );
      onUnmounted(() =>
        logs.push("two unmounted called " + ++counts.unmounted)
      );
      logs.push("two created called " + ++counts.created);

      return () => h("div", msg);
    },
  });

  const views = { one: One, two: Two };

  const Log = defineComponent({
    setup() {
      console.log("log render");
      return () =>
        h(
          "div",
          null,
          h(
            "p",
            { style: "color:red" },
            logs.map((log) => h("p", { style: "color:red" }, log))
          )
        );
    },
    beforeUpdate() {
      console.log("log before update");
    },
    updated() {
      console.log("log updated");
    },
  });

  watch(logs, (newLogs) => {
    newLogs.forEach((val) => console.log(val));
  });
  const Root = defineComponent({
    render() {
      const viewRef = ref("one");
      const insRef = ref(null);
      return h("div", [
        h(Log),
        h(
          "button",
          {
            onClick: () =>
              (viewRef.value = viewRef.value === "one" ? "two" : "one"),
          },
          "切换"
        ),
        h("button", { onClick: () => logs.splice(0) }, "清理LOG"),
        h(KeepAlive, null, {
          default: () => h(views[viewRef.value], { ref: insRef }),
        }),
      ]);
    },
    mounted() {
      console.log(logs);
    },
  });

  var app = Vue.createApp(Root);

  app.use(ElementPlus).mount("#r9KorlFxQ9");
})();
