try {
  const error = Vue.ref("");
  const HelloWorld = Vue.defineComponent({
    template: `<ul>TODOs: <slot/></ul>`,
  });
  const app = Vue.createApp({
    components: { HelloWorld },
    template: `
<div class="el-card is-always-shadow box-card">
  <div class="el-card__body">
    <p>vue@3.0.4 + 最新的 ElementPlus 会有 BUG，所以这里只使用它的 class，点击 ADD 按钮
会报错，错误信息可 &lt;F12&gt; 打开控制台查看。</p>
    <p>{{error}}</p>
    <button class="el-button el-button--primary" @click="click">ADD</button>
    <hello-world>
      <li v-for="(todo, i) in todos" :key="i">{{ todo }}</li>
    </hello-world>
    <hr/>
    <button class="el-button" @click="showIframe" style="margin-bottom:10px;">点我查看 Sandbox 示例</button>
    <iframe v-if="showSandbox" src="https://codesandbox.io/embed/laughing-matsumoto-5dd14?fontsize=14&hidenavigation=1&theme=dark"
        style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
        title="laughing-matsumoto-5dd14"
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
    ></iframe>
  </div>
</div>`,

    setup() {
      const todos = Vue.reactive([]);
      const showSandbox = Vue.ref(false)
      return {
        todos,
        click: () => todos.push(100),
        error,
        showSandbox,
        showIframe: () => ( showSandbox.value=true, console.log(showSandbox.value) )
      };
    },
  });
  app.config.errorHandler = (err) => {
    error.value = err.message;
    console.log(err.message);
  };
  app.use(ElementPlus).mount("#IR8Cl");
} catch (e) {
  // error.value = e.message
}
