(function() {
  const { h, createApp, ref, reactive, defineComponent, watch } = Vue;
  const { ElTable, ElTableColumn, ElInput, ElButton } = ElementPlus;

  const left = ref(""),
    right = ref("");
  const data = reactive([
    { left: 0, right: "" },
    { left: 0, right: "0" },
    { left: 0, right: [0] },
    { left: 0, right: ["0"] },
  ]);

  watch(
    data,
    () => {
      data.forEach((row, i) => {
        row.result = equal(row.left, row.right);
        row.result2 = row.left == row.right;
        row.key = i;
      });
    },
    { immediate: true }
  );

  const tableMetas = [
    {
      prop: "left",
      label: "左值",
      slots: {
        default: ({ row }) => showStr(row.left),
      },
    },
    {
      prop: "right",
      label: "右值",
      slots: {
        default: ({ row }) => showStr(row.right),
      },
    },
    {
      prop: "result",
      label: "equal(x,y)",
      width: "140px",
      slots: {
        default: ({ row }) => row.result + "",
      },
    },
    {
      prop: "result2",
      label: "x == y",
      width: "120px",
      slots: {
        default: ({ row }) => row.result2 + "",
      },
    },
    {
      prop: "errors",
      label: "信息",
      width: "280px",
      slots: {
        default: () =>
          h("div", {
            innerHTML: [logNumber, logPrimitive, logError]
              .map((err) => err)
              .join(""),
          }),
      },
    },
  ];
  const Table = defineComponent({
    render() {
      return h(
        ElTable,
        {
          data,
          style: "width: 100%",
        },
        {
          default: () => {
            return tableMetas.map(({ slots, ...prop }) =>
              h(ElTableColumn, prop, slots)
            );
          },
        }
      );
    },
  });

  const Root = defineComponent({
    render() {
      return h("div", {}, [
        h(Table),
        h("p", {
          innerHTML: `
<font color="blue">符号类型值请输入： Symbol:xxx 最终转成 Symbol('xxx')</font><br>
<font color="blue">BigInt类型值请输入： BigInt:xxx 最终转成 BigInt('xxx')</font><br>
`,
        }),
        h(
          "div",
          {
            style: {
              "padding-top": "10px",
              display: "flex",
              "justify-content": "space-arround",
            },
          },
          [
            h(ElInput, {
              onInput(val) {
                left.value = val;
              },
              placeholder: "请输入等号左边值",
              modelValue: left.value,
            }),
            h(ElInput, {
              onInput(val) {
                right.value = val;
              },
              placeholder: "请输入等号右边值",
              modelValue: right.value,
            }),
            h(
              ElButton,
              {
                onClick() {
                  data.push({
                    left: parse(left.value),
                    right: parse(right.value),
                  });
                },
              },
              {
                default: () => "提交",
              }
            ),
          ]
        ),
      ]);
    },
  });

  createApp(Root).mount("#X6j10iPkmj");

  function parse(v) {
    let r;
    if (/^Symbol:/.test(v)) {
      r = Symbol(v.replace(/^Symbol:/, ""));
    } else if (/^BigInt:/.test(v)) {
      r = BigInt(v.replace(/^BigInt:/, ""));
    }
    try {
      if (r !== undefined) {
        return r;
      }
      v = JSON.parse(v);
    } catch (e) {
      console.log(e.message);
    }
    console.log(v, "parsed");
    return v;
  }
})();
