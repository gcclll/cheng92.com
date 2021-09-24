(function() {
  const cached = new Map()

  const { reactive, computed } = Vue
  Vue.createApp({
    template: `
<el-form border :model="form">
<el-form-item label="Fibonacci" style="margin-bottom:0">
{{form.fibc}}: {{form.fibv}}
</el-form-item>
<el-form-item label="START" style="margin-bottom:0">{{form.start}}ms</el-form-item>
<el-form-item label="END" style="margin-bottom:0">{{form.end}}ms</el-form-item>
<el-form-item label="DURATION" style="margin-bottom:0">{{form.duration}}ms</el-form-item>
</el-form>
<div><p v-for="m in msg" v-html="m"/></div>
`,
    setup() {

      const form = reactive({
        fibc: 0,
        fibv: 0,
        start: 0,
        end: 0,
        duration: 0
      })
      const i = Vue.ref(0)
      const msg = Vue.reactive([])
      const log = m => msg.unshift(`<font color="red" size="2">${i++}: ${m}</font>`)
      form.start = performance.now()
      fib(100, (n, v) => {
        form.fibc = n
        form.fibv = v
      })
      form.end = performance.now()
      form.duration = computed(() => form.end - form.start)

      return { log, msg, form }
    }
  }).use(ElementPlus).mount('#x8jExKG')

  // developer provided method to upload runtime performance data

  // Translating worker timestamps into document's time origin
  // var worker = new SharedWorker('/js/tests/performance/worker.js');
  // worker.port.onmessage = function(event) {
  //   var msg = event.data;

  //   // translate epoch-relative timestamps into document's time origin
  //   msg.start_time = msg.start_time - performance.timeOrigin;
  //   msg.end_time = msg.end_time - performance.timeOrigin;

  //   console.log(msg, 'app.js');
  // }

  function fib(n, callback) {
    if (cached.has(n)) {
      const r = cached.get(n)
      callback(n, r)
      return r
    }

    if (n < 2) {
      return 1
    }

    const val = fib(n - 1, callback) + fib(n - 2, callback)
    cached.set(n, val)
    callback(n, val)
    return val
  }

}())
