var id = "tShhLU1P6z";
var app_tShhLU1P6z = (function () {
  const { ref, reactive, getCurrentInstance } = Vue;
  var app = Vue.createApp({
    template:
      `<p><el-button type="primary" @click="count++">测试++</el-button>: {{count}}</p>` +
      `<p><el-button @click="add">新增</el-button>` +
      `<el-button @click="del">删除</el-button>` +
      `<el-button @click="insert">插入</el-button>` +
      `<el-button @click="modify">修改</el-button></p>` +
      `<p>{{nums.join(',')}}</p>` +
      `<ul @vnode-updated="vnodeUpdated"><li v-for="n in nums" :key="n">No. = {{ n }}</li></ul>`,
    mounted() {
      log("option api mounted...");
    },
    setup(props, { slots }) {
      const count = ref(0);
      Vue.onMounted(() => log("setup mounted"));
      Vue.onBeforeUpdate(function (arg) {
        console.log({ arg }, "setup before update");
      });
      Vue.onUpdated((...args) => {
        log(args.concat("setup updated"));
        log(getCurrentInstance());
      });

      const nums = reactive([1, 3, 5, 8]);
      const random = (max = nums.length) => Math.floor(Math.random() * max);
      const randIdx = () => random(nums.length - 1);
      const add = () => nums.push(random(100));
      const del = () => nums.splice(randIdx(), 1);
      const insert = () => nums.splice(randIdx(), 0, random(100));
      const modify = () => (nums[randIdx()] = random(50));
      const vnodeUpdated = (vnode, prevVnode) => {
        domDiff(prevVnode?.children[0].children, vnode?.children[0].children);
        // console.log(vnode, prevVnode, "vnode updated");
      };

      return { count, nums, add, del, insert, modify, vnodeUpdated };
    },
  });
  app.use(ElementPlus).mount("#" + id);
  return app;
})();
