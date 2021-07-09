const counts = {};
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
    KeepAlive,
  }) => {
    log.br();
    let one, two, views, root;

    try {
      beforeEach({ nodeOps, h });
      const viewRef = ref("one");
      const insRef = ref(null);
      const App = {
        render() {
          console.log("render app");
          return h(KeepAlive, null, {
            default: () => h(views[viewRef.value], { ref: insRef }),
          });
        },
      };

      render(h(App), root);
      log([">>> 1", inner(root)]);
    } catch (e) {
      console.log(e.message);
    }
  }
);

function callHook(name) {
  return function () {
    let i = counts[name];
    if (i === undefined) {
      counts[name] = 0;
    }

    console.log(`${name} called ${++counts[name]}`);
  };
}

function beforeEach({ nodeOps, h }) {
  root = nodeOps.createElement("div");
  one = {
    name: "one",
    data: () => ({ msg: "one" }),
    render() {
      return h("div", this.msg);
    },
    created: callHook("one created"),
    mounted: callHook("one mounted"),
    activated: callHook("one activated"),
    deactivated: callHook("one deactivated"),
    unmounted: callHook("one unmounted"),
  };

  two = {
    name: "two",
    data: () => ({ msg: "two" }),
    render() {
      return h("div", this.msg);
    },
    created: callHook("two created"),
    mounted: callHook("two mounted"),
    activated: callHook("two activated"),
    deactivated: callHook("two deactivated"),
    unmounted: callHook("two unmounted"),
  };

  views = {
    one,
    two,
  };
}
