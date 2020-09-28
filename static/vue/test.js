(function () {
  {
    // test
    const Counter = {
      data() {
        return {
          counter: 0,
        };
      },
    };
    Vue.createApp(Counter).mount("#v-test-counter");
  } // test end

  {
    // slot 语法
    const app = Vue.createApp({
      data() {
        return {
          msg: "hello slot !",
        };
      },
    });

    app.component("foo", {
      data() {
        return {
          defaultSlotMsg:
            "1. 我是默认插槽 default，直接应用在 Foo 上 <Foo v-slot>",
          namedSlotMsg: "3. 我是具名插槽",
          shortSlotMsg: "4. 我是插槽指令缩写 shorthand",
        };
      },
      template: `
<div>
  <slot :msg="defaultSlotMsg"></slot>
  <slot name="zero"></slot>
  <slot name="one" :msg="namedSlotMsg"></slot>
  <slot name="two" :msg="shortSlotMsg"></slot>
</div>`,
    });

    app.component("foo2", {
      data() {
        return { foo: "foo" };
      },
      template: `<div><slot :foo="foo"></slot></div>`,
    });

    app.component("bar", {
      data() {
        return { bar: "bar" };
      },
      template: `<div><slot :bar="bar"></slot></div>`,
    });

    app.component("baz", {
      data() {
        return { baz: "baz" };
      },
      template: `<div><slot :baz="baz"></slot></div>`,
    });

    app.component("bax", {
      data() {
        return {
          users: [{ name: "foo" }, { name: "bar" }, { name: "baz" }],
          error: {
            message: "接口返回 500, 后端接锅。",
          },
        };
      },
      template: `
<div>
  <slot></slot>
  <div :style="{ 'text-indent': '1rem' }">
    <slot name="pending"></slot>
    <slot name="resolved" :users="users"></slot>
    <slot name="rejected" :error="error"></slot>
  </div>
</div>`,
    });

    app.mount("#v-test-slot");
  } // slot end
})();
