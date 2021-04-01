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

  const Async = defineAsyncComponent({
    render() {
      return h("div", "async");
    },
  });
  const Comp = {
    setup() {
      return () =>
        h(Suspense, null, {
          default: h(Async),
          fallback: h("div", "fallback"),
        });
    },
  };
  const Root = defineComponent({
    setup() {
      return () => h("div", null, Comp);
    },
  });
  const app = createApp(Root);

  app.mount("#WTYoDwLIkv");

  // 声明异步组件
  function defineAsyncComponent(comp, delay = 0) {
    return {
      setup(props, { slots }) {
        const p = new Promise((resolve) => {
          setTimeout(() => {
            resolve(() => h(comp, props, slots));
          }, delay);
        });

        deps.push(p.then(() => Promise.resolve()));
        return p;
      },
    };
  }
})();
