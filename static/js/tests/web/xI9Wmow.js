(function() {
  const E = ElementPlus
  const { reactive } = Vue
  const { ElMessage: Message, ElRow, ElCol, ElTooltip } = ElementPlus
  Vue.createApp({
    template: `
<p style="color:blue">每隔两秒取分别取一次 performance.now() 和 Date.now(): </p>
  <el-form :model="times" class="border">
  <el-form-item label="start performance:">{{times.startHrt}}</el-form-item>
  <el-form-item label="start date:">{{times.startDate}}</el-form-item>
  <el-form-item label="end performance:">{{times.endHrt}}</el-form-item>
  <el-form-item label="end date:">{{times.endDate}}</el-form-item>
  <el-form-item label="duration performance:">{{times.deltaHrt}}</el-form-item>
  <el-form-item label="duration date:">{{times.deltaDate}}</el-form-item>
  <el-form-item label="status" style="color:red">{{status ? '运行' : '暂停'}}中...</el-form-item>
  <el-form-item label="自定义事件">
    <el-input style="width:200px" placeholder="请输入自定义事件名" v-model="customEvent.data[0].label"/>
    <el-button type="primary" plain @click="add">添加事件</el-button>
    <el-button type="primary" plain @click="remove">移除事件</el-button>
    <el-button type="primary" plain @click="trigger">触发{{customEvent.name}}事件</el-button>
  </el-form-item>
</el-form>
<el-row>
<el-tree :data="customEvent.data"
          node-key="id"
          default-expand-all
          :render-content="renderTreeContent"/>
</el-row>
<el-button type="primary" @click="start" >开始</el-button>
<el-button type="primary" @click="stop">暂停</el-button>
<br/>
<div>
<el-card style="margin: 20px 0">
  <template #header>
    各属性所代表的含义：
  </template>
  <el-form :data="comments" label-width="220px">
    <el-form-item v-for="(value, prop) in comments" :label="prop">
    {{value}}
    </el-form-item>
  </el-form>
</el-card>
</div>
`,
    setup() {
      const times = reactive({
        startHrt: performance.now(),
        startDate: Date.now(),
        deltaHrt: 0,
        endHrt: 0,
        endDate: 0,
        deltaDate: 0,
      })
      const status = Vue.ref(true)
      const message = Vue.ref('')
      const customEvent = reactive({
        data: [{ id: 0, label: 'testEvent', children: [] }],
      })
      const eventName = Vue.computed(() => customEvent.data[0].label)

      let timer = null
      function start() {
        status.value = true
        timer = setInterval(() => {
          times.endHrt = performance.now()
          times.endDate = Date.now()
          times.deltaHrt = times.endHrt - times.startHrt
          times.deltaDate = times.endDate - times.startDate
        }, 2000)
      }
      function stop() {
        status.value = false
        clearInterval(timer)
      }

      const handler = (e) => {
        console.log(e.target.timing, '100');
        customEvent.data[0].children = jsonToTreeData(e.target)

      }
      const oldName = Vue.ref('')
      function add() {
        if (eventName.value) {
          if (oldName.value) {
            remove(oldName.value)
          }
          oldName.value = eventName.value
          performance.addEventListener(eventName.value, handler)
          Message({
            message: '添加事件 ' + eventName.value + ' 成功',
            type: 'success'
          })
        }
      }

      const comments = {
        navigationStart: '同一个浏览器上一个页面卸载(unload)结束时的时间戳。如果没有上一个页面，这个值会和fetchStart相同。',
        unloadEventStart: '上一个页面unload事件抛出时的时间戳。如果没有上一个页面，这个值会返回0。',
        unloadEventEnd: '和 unloadEventStart 相对应，unload事件处理完成时的时间戳。如果没有上一个页面,这个值会返回0。',
        redirectStart: '第一个HTTP重定向开始时的时间戳。如果没有重定向，或者重定向中的一个不同源，这个值会返回0。',
        redirectEnd: '最后一个HTTP重定向完成时（也就是说是HTTP响应的最后一个比特直接被收到的时间）的时间戳。如果没有重定向，或者重定向中的一个不同源，这个值会返回0. ',
        fetchStart: '浏览器准备好使用HTTP请求来获取(fetch)文档的时间戳。这个时间点会在检查任何应用缓存之前。',
        domainLookupStart: 'DNS 域名查询开始的UNIX时间戳。如果使用了持续连接(persistent connection)，或者这个信息存储到了缓存或者本地资源上，这个值将和fetchStart一致。',
        domainLookupEnd: 'DNS 域名查询完成的时间.如果使用了本地缓存（即无 DNS 查询）或持久连接，则与 fetchStart 值相等',
        connectStart: 'HTTP（TCP） 域名查询结束的时间戳。如果使用了持续连接(persistent connection)，或者这个信息存储到了缓存或者本地资源上，这个值将和 fetchStart一致。',
        connectEnd: 'HTTPS 返回浏览器与服务器开始安全链接的握手时的时间戳。如果当前网页不要求安全连接，则返回0。',
        requestStart: '返回浏览器向服务器发出HTTP请求时（或开始读取本地缓存时）的时间戳。',
        responseStart: '返回浏览器从服务器收到（或从本地缓存读取）第一个字节时的时间戳。如果传输层在开始请求之后失败并且连接被重开，该属性将会被数制成新的请求的相对应的发起时间。',
        responseEnd: '返回浏览器从服务器收到（或从本地缓存读取，或从本地资源读取）最后一个字节时（如果在此之前HTTP连接已经关闭，则返回关闭时）的时间戳。',
        domLoading: '当前网页DOM结构开始解析时（即Document.readyState属性变为“loading”、相应的 readystatechange事件触发时）的时间戳。',
        domInteractive: '当前网页DOM结构结束解析、开始加载内嵌资源时（即Document.readyState属性变为“interactive”、相应的readystatechange事件触发时）的时间戳。',
        domContentLoadedEventStart: '当解析器发送DOMContentLoaded 事件，即所有需要被执行的脚本已经被解析时的时间戳。',
        domContentLoadedEventEnd: '当所有需要立即执行的脚本已经被执行（不论执行顺序）时的时间戳。',
        domComplete: '当前文档解析完成，即Document.readyState 变为 complete 且相对应的readystatechange 被触发时的时间戳',
        loadEventStart: 'load事件被发送时的时间戳。如果这个事件还未被发送，它的值将会是0。',
        loadEventEnd: '当load事件结束，即加载事件完成时的时间戳。如果这个事件还未被发送，或者尚未完成，它的值将会是0.',
      }
      function renderTreeContent(h, { node, data }) {
        const hasValue = data.value !== null
        return h(ElRow, {
          style: 'width: 500px'
        }, {
          default: () => [
            h(ElCol, { span: 12 }, {
              default: () => h(ElTooltip, {
                placement: 'top-start',
                effect: "dark",
                content: comments[node.label] || 'null'
              }, {
                default: () => h('span', {
                  style: 'color: #92278f'
                }, node.label + (hasValue ? ':' : ''))
              })
            }),
            hasValue ? h(ElCol, { span: 12 }, {
              default: () => h('span', {
                style: 'color:#25aae2'
              }, data.value)
            }) : null,
          ]
        })
      }

      function remove(name) {
        if (name || eventName.value) {
          performance.removeEventListener(name || eventName.value, handler)
          Message({
            message: '移除事件 ' + eventName.value + ' 成功',
            type: 'warning'
          })

        }
      }

      function trigger() {
        performance.dispatchEvent(new Event(eventName.value))
      }

      Vue.onMounted(() => {
        start()
        add()
        setTimeout(trigger, 100)
      })

      return {
        times, start, stop, status, customEvent,
        add, remove, trigger, message, renderTreeContent,
        comments, active: Vue.ref('form')
      }
    }
  }).use(ElementPlus).mount("#I9Wmow")
}())
