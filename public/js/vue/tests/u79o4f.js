class TestElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' })
    const wrapper = document.createElement('span');
    const btn1 = document.createElement('button');
    const btn2 = document.createElement('button');
    btn1.innerText = "click lower case";
    btn2.innerText = "click kebab case";
    btn1.addEventListener('click', () => {
      const evt = new CustomEvent('foobar', { detail: 'lower' });
      this.dispatchEvent(evt);
    })
    btn2.addEventListener('click', () => {
      const evt = new CustomEvent('foo-bar', { detail: 'kebab' });
      this.dispatchEvent(evt);
    })
    wrapper.appendChild(btn1);
    wrapper.appendChild(btn2);
    this.shadowRoot.append(wrapper);
  }
}

window.customElements.define('test-element', TestElement)


const app_u79o4f = Vue.createApp({
  template: `
<test-element @foo-bar="log" @foobar="log" ref="testElement"></test-element>
{{message}}
<br/>
<el-button type="primary" @click="mountEventListener">加载原生事件</el-button>
`,
  data: () => ({
    message: 'Nothing was clicked',
  }),
  methods: {
    log(evt) {
      this.message = 'Clicked ' + evt.detail
    },
    mountEventListener() {
      this.$refs.testElement.addEventListener('foobar', this.log)
      this.$refs.testElement.addEventListener('foo-bar', this.log)
    }
  }
})

// app_u79o4f.config.isNativeTag = (tag) => tag === 'test-element'

app_u79o4f.use(ElementPlus).mount('#u79o4f')
