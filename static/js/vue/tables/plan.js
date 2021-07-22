var prefix = "q9djlA";
var plans = [
  {
    link: "/web/web-component.org",
    name: "Web Component",
    status: "WAITING",
    desc: "WEB 原生组件",
  },
  {
    link: "/vue/vue-mind-map-reactivity",
    name: "vue3/reactivity",
    status: "DONE",
    class: "green",
    startTime: "2020-11-09",
    desc: "基于 proxy+ reflect 的响应式模块",
  },
  {
    link: "/vue/vue-mind-map-compiler-core-transform-generate",
    name: "vue3/compiler-core",
    status: "DONE",
    startTime: "2020-11-24",
    desc: "ast-transform-generate",
  },
  {
    link: "/vue/vue-mind-map-compiler-dom",
    name: "vue3/compiler-dom",
    status: "DONE",
    startTime: "2020-12-16",
    desc: "处理指令模块",
  },
  {
    link: "/vue/vue-mind-map-compiler-sfc",
    name: "vue3/compiler-sfc",
    status: "DONE",
    startTime: "2020-12-19",
    desc: "SFC, .vue 文件解析",
  },
  {
    link: "",
    name: "vue3/compiler-ssr",
    status: "PENDING",
    startTime: "2021-01-04",
    desc: "SSR, 服务端渲染",
  },
  {
    link: "/vue/vue-mind-map-runtime-core",
    name: "vue3/runtime-core",
    status: "DONE",
    startTime: "2021-01-08",
    desc: "解析 AST 生成 render 函数",
  },
  {
    link: "/vue/vue-vite",
    name: "vite",
    status: "WAITING",
    startTime: "-",
    desc: "vue3 官方脚手架",
  },
  {
    link: "/vue/vue-router-next",
    name: "vue-router-next",
    status: "PENDING",
    startTime: "2021-03-05",
    desc: "vue3 路由，暂停一会",
  },
  {
    link: "/vue/vue-vuex",
    name: "vuex 4.0",
    status: "DONE",
    startTime: "2021-03-10",
    desc: "vue3 数据管理",
  },
  {
    link: "/vue/vue-core-patch-flags",
    name: "vue3 功能细化",
    status: "DOING",
    startTime: "2021-03-10",
    desc: "功能细化分析",
  },
];

plans = [].concat(plans.filter((p) => p.status === 'DOING'),
                  plans.filter(p => p.status === 'PENDING'),
                  plans.filter(p => p.status === 'WAITING'),
                  plans.filter(p => p.status === 'DONE'),
                 )
plans.forEach(function(plan) {
  plan.class = prefix + " " + prefix + "-" + plan.class;
});

Vue.createApp({
  template: `
   <el-table :data="plans" style="width: 100%" :row-class-name="tableRowClassName">
    <el-table-column prop="name" label="名称" width="180">
      <template #default="{ row }">
        <el-link :href="row.link" target="_blank">{{row.name}}</el-link>
      </template>
    </el-table-column>
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
  data: function() {
    return {
      hi: "xxxx",
      plans,
    };
  },
})
  .use(ElementPlus)
  .mount("#table-plan");


///////////////////////////////////////////////////////////////////////////////
//                                V3BOSS PlAN                                //
///////////////////////////////////////////////////////////////////////////////
