const toStrs = (m) =>
  m.map((x) => (typeof x === "object" ? JSON.stringify(x) : x));

function useLog(title) {
  let endLine = false,
    unshift = false,
    o = {}; // 日志往前插
  if (title && typeof title === "object") {
    o = title;
    ({ endLine, title, unshift } = o);
  } else if (title === true) {
    endLine = true;
    title = undefined;
  }

  const logs = Vue.reactive([]);

  const log = (...m) => {
    if (o.replace) {
      logs.splice(0, logs.length, ...m);
      return log;
    }
    const fnName = unshift ? "unshift" : "push";
    logs[fnName](...toStrs(m));
    if (endLine === true) {
      logs[fnName]("-----------------------------");
    }
    return log;
  };
  log.push = (...m) => {
    logs.push(...toStrs(m));
    return log;
  };

  const Log = Vue.h(
    ElementPlus.ElCard,
    {
      style: { margin: "5px 0" },
    },
    {
      header: () => title ?? "测试日志",
      default: () => logs.map((log, i) => Vue.h("div", { key: i }, log)),
    }
  );

  return { log, logs, Log };
}

function useDescription(title) {
  const { ref, h, defineComponent } = Vue;
  const { ElCard } = ElementPlus;
  let isHtml = false;
  const display = ref("none");
  const desc = ref("暂无信息。");

  if (typeof title === "object") {
    const o = title;
    isHtml = o.html;
    if (o.display) {
      // 用来设置默认是显示还是隐藏
      display.value = o.display;
    }
    if (o.desc) {
      desc.value = o.desc;
    }
    title = o.title;
  }

  const Description = defineComponent({
    render() {
      return h(
        ElCard,
        {
          style: { margin: "5px 0", display: display.value },
        },
        {
          header: () => [
            h("i", { class: "el-icon-info" }, title ?? "描述信息"),
            h("i", {
              class: "el-icon-close",
              style: { float: "right", cursor: "pointer" },
              onClick() {
                display.value = "none";
              },
            }),
          ],
          default: () =>
            isHtml ? h("div", { innerHTML: desc.value }) : desc.value,
        }
      );
    },
  });

  const setDesc = (val) => {
    if (val) {
      desc.value = val;
      display.value = "block";
    }
  };

  return { Description, setDesc };
}

function filterFns(o = {}) {
  const res = {};
  Object.keys(o).forEach((key) =>
    typeof o[key] !== "function" ? (res[key] = o[key]) : null
  );
  return res;
}

function domDiffProps(newProps, oldProps, option) {
  domDiff(filterFns(newProps), filterFns(oldProps), option);
}

function run_vue_tmpl(id, template, data = {}) {
  const app = Vue.createApp({
    template: `<div class="comment-block">${template}</div>
    <el-button type="primary" @click="click">查看测试源码</el-button>
    <div class="chroma language-js" v-if="showCode"><pre class="chroma">{{code}}</pre></div>
  `,
    setup() {
      const showCode = Vue.ref(false)
      return {
        showCode,
        code: Vue.computed(() => document.querySelector(`script.${id}`).textContent),
        click: () => (showCode.value = !showCode.value),
        ...data
      }
    }
  })
  const root = document.getElementById(id)
  app.use(ElementPlus).mount(root)
}
