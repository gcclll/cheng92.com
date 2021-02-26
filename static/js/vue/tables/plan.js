var prefix = "q9djlA";
var plans = [
  {
    name: "vue3/reactivity",
    status: "DONE",
    class: "green",
    startTime: "2020-11-09",
    desc: "基于 proxy+ reflect 的响应式模块",
  },
  {
    name: "vue3/compiler-core",
    status: "DONE",
    startTime: "2020-11-24",
    desc: "ast-transform-generate",
  },
  {
    name: "vue3/compiler-dom",
    status: "DONE",
    startTime: "2020-12-16",
    desc: "处理指令模块",
  },
  {
    name: "vue3/compiler-sfc",
    status: "DONE",
    startTime: "2020-12-19",
    desc: "SFC, .vue 文件解析",
  },
  {
    name: "vue3/compiler-ssr",
    status: "PENDING",
    startTime: "2021-01-04",
    desc: "SSR, 服务端渲染",
  },
  {
    name: "vue3/runtime-core",
    status: "DOING",
    startTime: "2021-01-08",
    desc: "解析 AST 生成 render 函数",
  },
  { name: "vite", status: "WAITING", startTime: "-", desc: "vue3 官方脚手架" },
  {
    name: "vue-router-next",
    status: "DOING",
    startTime: "-",
    desc: "vue3 路由",
  },
];

plans.forEach(function (plan) {
  plan.class = prefix + " " + prefix + "-" + plan.class;
});

Vue.createApp({
  template: `
   <el-table :data="plans" style="width: 100%" :row-class-name="tableRowClassName">
    <el-table-column prop="name" label="名称" width="180"></el-table-column>
    <el-table-column prop="status" label="状态" width="120"></el-table-column>
    <el-table-column prop="desc" label="描述" width="180"></el-table-column>
    <el-table-column prop="startTime" label="开始时间" width="130"></el-table-column>
  </el-table>
`,
  methods: {
    tableRowClassName({ row, rowIndex }) {
      return row.status;
    },
  },
  data: function () {
    return {
      hi: "xxxx",
      plans,
    };
  },
})
  .use(ElementPlus)
  .mount("#table-plan");
