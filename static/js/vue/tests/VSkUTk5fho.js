var app_VSkUTk5fho = (function () {
  const {
    h,
    defineComponent,
    ref,
    withDirectives,
    currentInstance,
    reactive,
    watch,
  } = Vue;
  const { ElButton } = ElementPlus;
  let _instance = null,
    _vnode = null,
    _prevVnode = null;

  const logs = reactive([">>>log:"]);

  function genLC(name) {
    return function lc(el, binding, vnode, prevVNode) {
      logs.push(`---------- ${name} ----------`);
      logs.push(`el = ` + el.outerHTML);
      logs.push(`el.parentNode = root ? ` + (el.parentNode == Root));

      const child = (el.children || el.childNodes)[0];
      console.log(el, child);
      if (child) {
        logs.push(`child.text = ` + (count.value - 1));
        logs.push(`child.text = ` + count.value);
        logs.push(`child === el, ` + (child === el));
      } else {
        logs.push(`el.children.length === 0`);
      }

      logs.push(`vnode === _vnode, ` + (vnode === _vnode));
      logs.push(`prevVNode === _prevVnode, ` + (prevVNode === _prevVnode));
      // logs.forEach((log) => console.log(log));
    };
  }

  watch(logs, (newLogs) => {
    newLogs.forEach((log) => console.log(log));
  });

  const dir = {
    beforeMount: genLC("beforeMount"),
    mounted: genLC("mounted"),
    beforeUpdate: genLC("beforeUpdate"),
    updated: genLC("updated"),
    beforeUnmount: genLC("beforeUnmount"),
    unmounted: genLC("unmounted"),
  };

  const count = ref(0);

  const Comp = defineComponent({
    render() {
      _prevVnode = _vnode;

      _vnode = withDirectives(h("div", count.value), [
        [
          dir, // v-dir
          count.value, // value, v-dir="value"
          "foo", // arg, v-dir:foo="value"
          { ok: true }, // v-dir:foo.ok="value"
        ],
      ]);

      return _vnode;
    },
  });

  const Log = defineComponent({
    setup() {
      return () =>
        h(
          "div",
          null,
          logs.map((log) => h("p", { style: { color: "red" } }, log))
        );
    },
  });

  const Count = defineComponent({
    setup() {
      return () =>
        h("div", [
          h(
            ElButton,
            { onClick: () => count.value++, type: "primary" },
            {
              default: () => "+",
            }
          ),
          h(
            ElButton,
            { onClick: () => count.value++, type: "primary" },
            {
              default: () => "-",
            }
          ),
          h("span", { style: { padding: "0 10px" } }, count.value),
        ]);
    },
  });

  const Root = defineComponent({
    setup() {
      return () => h("div", [h(Log), h(Comp), h(Count)]);
    },
  });

  const app = Vue.createApp(Root);

  app.use(ElementPlus).mount("#VSkUTk5fho");
})();
