const { log, f, shuffle, runtime_test, renderChildren } = require(process.env
  .BLOG_DIR_VUE + "/lib.js");
import(process.env.BLOG_DIR_VUE + "/runtime-test.global.js").then(
  async ({
    nextTick,
    h,
    render,
    nodeOps,
    serializeInner: inner,
    ref,
    Suspense,
  }) => {
    log.br();
    const deps = [];
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

    const root = nodeOps.createElement("div");
    try {
      render(h(Comp), root);
    } catch (e) {
      console.log(e);
    }
    console.log("before");
    console.log(inner(root));

    await Promise.all(deps);
    await nextTick();
    console.log("after");
    console.log(inner(root));
  },
  (err) => {
    console.log(err);
  }
);
