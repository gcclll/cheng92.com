var app_dzwrLeuq5V = (function () {
  const {
    h,
    defineComponent,
    createApp,
    Teleport,
    ref,
    reactive,
    render: domRender,
    compile,
  } = Vue;
  const count = ref(0);
  const logs = reactive([]);
  let j = 0,
    i = ref(0);
  const Root = defineComponent({
    render() {
      return h("div", [
        h(Teleport, { to: "#p0" }, "teleported 0"),
        teleport(),
        h(
          "button",
          {
            onClick: () => i.value++,
          },
          "teleport"
        ),
      ]);
    },
  });

  function teleport() {
    return h(Teleport, { to: "#p" + i.value }, "teleported " + i.value);
  }

  var app = createApp(Root);
  console.log(app);

  app.mount("#dzwrLeuq5V");
  return app;
})();
