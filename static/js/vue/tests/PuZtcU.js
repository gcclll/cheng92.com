var app_PuZtcU = (function() {
  const {
    createApp,
    defineComponent,
  } = Vue;

  const Root = defineComponent({
    template: `<div>test....</div>`,
    setup() {
    },
  });
  const app = createApp(Root);

  app.use(ElementPlus).mount("#PuZtcU");
})();
