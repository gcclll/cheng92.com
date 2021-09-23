var app_x77w0JV = Vue.createApp({
  template: `
<el-button type="primary" @click="send1">1. CHANNEL1-PORT1: send</el-button>
<el-button type="primary" @click="send2">2. CHANNEL1-PORT2: send</el-button>
<el-button type="primary" @click="msgs.splice(0);i=0">CLEAR</el-button>
<div><p v-for="msg in msgs" v-html="msg" style="margin:0;padding:0"/></div>
<p>------- 测试：使用 addEventListener('message',...) -------</p>
<el-button type="primary" @click="send21">3. CHANNEL2-PORT1: send</el-button>
<el-button type="primary" @click="send22">4. CHANNEL2-PORT2: send</el-button>
<p style="margin-top:10px">
<el-button type="primary" @click="startPort1">5. CHANNEL2-PORT1: start</el-button>
<el-button type="primary" @click="startPort2">6. CHANNEL2-PORT2: start</el-button>
<p style="margin-top:10px">
<el-button type="primary" @click="closePort1">7. CHANNEL2-PORT1: close</el-button>
<el-button type="primary" @click="closePort2">8. CHANNEL2-PORT2: close</el-button>
</p>

</p>
`,
  setup() {
    let i = Vue.ref(0)
    const msgs = Vue.reactive([])
    const channel = new MessageChannel()
    channel.port1.onmessage = function(event) {
      msgs.push(event.data)
    }
    channel.port2.onmessage = function(event) {
      msgs.push(event.data)
    }
    const push = msg => msgs.push(log(msg, '#FF6464'))
    const log = (msg, color = "red") => `<font color="${color}">${i.value++}: ${msg}</font>`
    function send1() {
      channel.port1.postMessage(log(`hello channel1 port2`))
    }

    function send2() {
      channel.port2.postMessage(log(`hello channel1 port1`, 'blue'))
    }

    // use addEventListener
    const channel2 = new MessageChannel()
    channel2.port1.addEventListener('message', (e) => msgs.push(e.data))
    channel2.port2.addEventListener('message', (e) => msgs.push(e.data))
    function send21() {
      channel2.port1.postMessage(log(`hello channel2 port2`, 'black'))
    }
    function send22() {
      channel2.port2.postMessage(log(`hello channel2 port1`, 'purple'))
    }

    let started1 = false
    function startPort1() {
      if (started1) return
      push('channel2: start port1')
      channel2.port1.start()
      started1 = true
    }

    let started2 = false
    function startPort2() {
      if (started2) return
      push('channel2: start port2')
      channel2.port2.start()
      started2 = true
    }

    function closePort1() {
      push('channel2: close port1')
      channel2.port1.close()
      started1 = false
    }

    function closePort2() {
      push('channel2: close port2')
      channel2.port2.close()
      started2 = false
    }

    return { msgs, i, send1, send2, send21, send22, startPort1, startPort2, closePort1, closePort2 }
  },
})
app_x77w0JV.use(ElementPlus).mount('#x77w0JV')
