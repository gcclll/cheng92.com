var prefix = "q9djlA";
var plans = [];

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
  .mount("#nodejs");
