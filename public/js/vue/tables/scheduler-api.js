(function() {
  const { h, createApp, defineComponent } = Vue;
  const { ElTable, ElTableColumn, ElLink } = ElementPlus;

  const apis = [
    {
      name: "queueJob",
      locate: "componentPublicInstance.ts",
      desc: "$foceUpdate 强制更新时",
      link: "#queue-job",
    },
    {
      name: "queuePreFlushCb",
      locate: "apiWatch.ts",
      desc: "watch job 非首次调用的时候",
      link: "#queue-pre-cb",
    },
    {
      name: "queuePostFlushCb",
      locate: "Suspense.ts",
      desc: "封装成了 queueEffectWithSuspense",
      link: "#queue-post-cb",
    },
    {
      name: "queueEffectWithSuspense",
      locate: "renderer.ts",
      desc: "封装成了 queuePostRenderEffect",
      link: "#suspense",
    },
    {
      name: "queuePostRenderEffect",
      locate: "renderer.ts - setRef",
      desc: "当 ref 值更新时用来链接真实DOM元素的",
      link: "#queue-post-render-effect",
    },
    {
      name: "",
      locate: "renderer.ts - mountElement",
      desc: "vnode mounted hooks",
    },
    {
      name: "",
      locate: "renderer.ts - patchElement",
      desc: "vnode updated hooks",
    },
    {
      name: "",
      locate: "renderer.ts - setupRenderEffect",
      desc: "instance.update 函数中 hooks 执行队列([vnode]mounted&updated) ",
    },
    {
      name: "",
      locate: "renderer.ts - move",
      desc: "transition enter hook 执行队列",
    },
    {
      name: "",
      locate: "renderer.ts - unmount",
      desc: "vnode unmounted hooks 执行队列",
    },
    {
      name: "",
      locate: "renderer.ts - unmountComponent",
      desc: "unmounted hooks 执行队列，以及重置 isUnmounted 标识任务",
    },
    { name: "", locate: "renderer.ts - activate", desc: "activated hooks" },
    { name: "", locate: "renderer.ts - deactivate", desc: "deactivated hooks" },
    {
      name: "",
      locate: "renderer.ts - doWatch",
      desc: "~flush: post~ 类型的 job 和 effect runner",
    },
    {
      name: "flushPreFlushCbs",
      locate: "renderer.ts - updateComponentPreRender",
      desc:
        "组件更新之前 flush post cbs，属性更新可能触发了 pre-flush watchers，组件更新之前先触发这些 jobs",
      link: "#flush-pre",
    },
    {
      name: "flushPostFlushCbs",
      locate: "renderer.ts - render",
      desc: "组件 patch 之后触发一次 post cbs flush",
      link: "#flush-post",
    },
  ];

  const Table = defineComponent({
    render() {
      return h(
        ElTable,
        {
          data: apis,
          style: { width: "100%" },
          spanMethod({ row, column, rowIndex, columnIndex }) {
            if (columnIndex === 0) {
              if (rowIndex === 4) {
                return [10, 1];
              } else if (rowIndex > 4 && rowIndex < 14) {
                return [0, 0];
              }
            }
          },
        },
        {
          default: () =>
            [
              {
                prop: "name",
                label: "API 名称",
              },
              {
                prop: "locate",
                label: "所在文件",
              },
              {
                prop: "desc",
                label: "简介",
              },
            ].map((props) =>
              h(ElTableColumn, props, {
                default:
                  props.prop === "name"
                    ? ({ row }) => {
                      return row.link
                        ? h(
                          ElLink,
                          {
                            href: row.link,
                          },
                          { default: () => row.name }
                        )
                        : row.name;
                    }
                    : null,
              })
            ),
        }
      );
    },
  });
  createApp(Table).mount("#NlqF2kMRXC");
})();
