var app_WTYoDwLIkv = (function () {
  const {
    Suspense,
    render: domRender,
    h,
    ref,
    nodeOps,
    createApp,
    defineComponent,
  } = Vue;

  const deps = [];

  const Async = defineComponent({
    setup() {
      const p = new Promise((resolve) => {
        setTimeout(() => resolve(() => h("div", "async")), 2000);
      });
      // deps.push(p.then(() => Promise.resolve()));
      return p;
    },
  });

  const Comp = defineComponent({
    setup() {
      return () =>
        h(Suspense, null, {
          default: h(Async),
          fallback: h("div", "fallback"),
        });
    },
  });

  const CompA = {
    // setup() {
    //   return () => h("div", "comp a");
    // },
    setup() {
      return () => h("el-button", "el button");
    },
  };
  const Root = defineComponent({
    setup() {
      console.log("root setup...");
      return () => h("div", { id: "root" }, [CompA]);
    },
  });
  const app = createApp(Root);

  app.use(ElementPlus).mount("#WTYoDwLIkv");
})();
