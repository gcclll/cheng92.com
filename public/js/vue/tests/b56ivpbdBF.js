(function() {
  const {
    createApp,
    watch,
    defineComponent,
    h,
    ref,
    reactive,
    onUpdated,
    // getCurrentInstance,
  } = Vue;
  const { ElButton, ElCard } = ElementPlus;
  const toStr = (o) => JSON.stringify(o);
  const logs = reactive(["操作日志："]);
  const log = (msg) => logs.push(msg);

  const Count = defineComponent({
    setup() {
      const count = ref(0);

      watch(
        count,
        (newVal, oldVal) => {
          log("watch post cb: " + toStr({ newVal, oldVal }));
        },
        { flush: "post" }
      );

      watch(count, (newVal, oldVal) => {
        log("watch pre cb: " + toStr({ newVal, oldVal }));
      });

      onUpdated(() => {
        log("updated hook post cb before");
      });

      onUpdated(() => {
        log("updated hook post cb after");
      });

      const increment = () => count.value++;
      const decrement = () => count.value--;
      const reset = () => (count.value = 0);

      return { count, increment, decrement, reset };
    },
    render() {
      // const ins = getCurrentInstance();
      // console.log(ins.proxy.$forceUpdate, this.$forceUpdate);
      const span = h("span", null, `count = ${this.count}`);
      return h("div", [
        span,
        h("br"),
        h(
          ElButton,
          { onClick: this.increment, type: "primary" },
          {
            default: () => "+",
          }
        ),
        h(
          ElButton,
          { onClick: this.decrement, type: "danger" },
          {
            default: () => "-",
          }
        ),
        h(
          ElButton,
          {
            onClick: () => {
              this.reset();
              this.$forceUpdate({
                update: log("job: from $forceUpdate"),
              });
            },
          },
          { default: () => "$forceUpdate" }
        ),
        h(
          ElButton,
          { onClick: () => logs.splice(1), type: "warning" },
          { default: () => "清理操作日志" }
        ),
        h(
          ElCard,
          {
            style: { marginTop: "5px" },
          },
          {
            default: () =>
              logs.map((log, i) =>
                h(
                  "div",
                  {
                    key: i,
                  },
                  log
                )
              ),
          }
        ),
      ]);
    },
  });

  const app = createApp(Count);

  app.mount("#b56ivpbdBF");
})();
