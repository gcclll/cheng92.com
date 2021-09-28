(function() {
  const { log, logs } = useLog()
  const toString = m => typeof m === 'object' ? JSON.stringify(m) : m

  window.__log = function(title, type, ...message) {
    const argc = arguments.length
    if (argc === 1) {
      return log.info(toString(title))
    }

    if (typeof type === 'object') {
      message.unshift(type)
      type = 'info'
    }

    title && log.title(title)
    message.forEach(
      (m) => (
        typeof log[type] === 'function' ? log[type] : log
      )(toString(m))
    )
  }

  let eventLog = []

  Vue.createApp({
    template: `
<div class="mark" style="max-height:500px;overflow:scroll;margin-bottom:10px">
  <p v-for="log in logs" v-html="log"/>
</div>`,
    setup() {
      log.info(`start --------->`)

      Vue.onMounted(() => {
        // 在 deadline 之前就结束的任务
        test(`task that finishes before deadline`, NormalPriority, () => {
          log.event('Task1')
        })
        test('task with continuation', NormalPriority, () => {
          log.event('Task2')
          let i = 0
          while (shouldYield()) {
            log.event(`${i}: should yield ?`)
            if (++i >= 4) break
          }
          log.info(`Yield at ${performance.now()}ms`)
          return () => log.event('Continuation')
        })

      })

      return {
        log, logs
      }
    }
  }).use(ElementPlus).mount('#xGUn4jG')

  function test(mark, priority, callback) {
    log.se(`>>>>>>>>> start: ${mark}`)
    scheduleCallback(priority, () => {
      var continuation = callback()
      log.se(`<<<<<<<<< end: ${mark}`)
      return continuation
    })
  }

  function useLog() {
    const logs = Vue.reactive([])
    function log(msg, isTitle) {
      msg = isTitle ? msg : (performance.now() + ': ' + msg)
      logs.unshift(msg)
    }
    log.event = (m, f) => log(`<span style="color:#c05b4d;font-weight:800">task callback called: ${m}</span>`, f)
    log.title = m => log(`<span style="color:black;font-weight:800;">[${m}]</span>`, true)
    log.info = log
    log.warn = (m, f) => log(`<span style="color:#006464">${m}</span>`, f)
    log.danger = (m, f) => log(`<span style="color:red">${m}</span>`, f)
    log.se = (m) => log.danger(m, true)

    return { logs, log }
  }
}())
