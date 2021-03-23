var app_dzwrLeuq5V = (function () {
  const { h, defineComponent, createApp } = Vue;

  var Parent = defineComponent({
    render() {
      return h("h4", "test component render");
    },
  });

  // var Button = defineComponent({
  //   render() {
  //     return h("button", "测试");
  //   },
  // });
  var app = createApp(Parent);
  console.log(app);

  app.mount("#dzwrLeuq5V");
  return app;
})();
