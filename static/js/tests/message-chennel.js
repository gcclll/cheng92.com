(function() {
  Vue.createApp({
    template: `
<el-button @click="start" plain type="primary">发送</el-button>
<div class="mark">
<p v-for="log in logs" v-html="log"/>
</div>
`,
    setup() {
      const logs = Vue.reactive(['--- begin ---'])

      const channel = new MessageChannel()
      const i = Vue.ref(0)
      channel.port2.onmessage = () => logs.push(`${i.value}: message from PORT1...`)

      return {
        logs,
        start() {
          const val = ++i.value
          channel.port1.postMessage(`${val}: message to PORT2`)
          logs.push(`${val}: should this log before channel ?`)
          setTimeout(() => logs.push(`${val}: should timeout before channel ?`))
        }
      }
    }

  }).use(ElementPlus).mount('#xqoc5YN')
}())
