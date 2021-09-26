(function() {
  const defaultFiltered = {
    label: '这里显示搜索结果'
  }

  const E = ElementPlus;
  Vue.createApp({
    template: `
<h3><a href="#getEntries"/>performance.getEntries()</h3>
<p><code>getEntriesByName(name)</code> 根据名称取 <a href="#PerformanceEntry">PerformanceEntry</a> 列表</p>
<p><code>getEntriesByType(entryType)</code> 根据 Entry 类型取 <a href="#PerformanceEntry">PerformanceEntry</a> 列表</p>
<el-tree :data="data.tree" :render-content="renderContent"/>
<br/>
<p><code>performance.getEntriesByName('...')</code> 根据名字查找资源性能数据</p>
<el-switch
    style="margin-bottom:15px"
    v-model="searchMethod"
    active-text="filter + includes 过滤"
    inactive-text="getEntriesByName 和 getEntriesByType 搜索"
/>
<el-input style="width:400px;margin-right:10px;"
    v-model="search"
    placeholder="请输入名称(name)或类型(entryType)进行模糊搜索"
/><el-button plain type="primary" @click="runSearch">搜索</el-button>
<el-tree style="margin-top:20px" :data="data.filtered" :render-content="renderContent"/>
<h3><a href="#mark">performance.mark(name)</a></h3>
<div class="comment-block">
<code>mark(name)</code>会在浏览器的 performance entry buffer 中创建一个名为 name 的时间戳，返回一个 PerformanceMark entry 记录。
</div>
<div class="mark" style="margin-bottom:10px;">
    <p v-for="m in mark.log">{{m}}</p>
</div>
<el-input style="width:300px;margin-right:10px"
    placeholder="输入 'mark' 或 标记名称搜索"
    v-model="mark.search"
/>
<el-button type="primary" plain @click="searchMark">搜索</el-button>
<el-button type="primary" plain
    @click="clearMark">performance.clearMarks() 清楚所有标记</el-button>
<el-tree style="margin-top:20px" :data="mark.data" :render-content="renderContent"/>
<br/>
<br/>
<p>
在 ... 不更新之后，点击“搜索”按钮使用 <code>performance.getEntriesByType('mark')</code> 或 <code>performance.getEntriesByName('test')</code> ，
进行搜索，将显示两条数据，一个分别是是 1:mark start, name: test 对应的，一个是 150: marker end, name test 结束时打下的 mark。清楚之后，再点击搜索将搜索不到任何
结果。
</p>

<h3><a href="#measure">performance.measure(name, [startMark|undefined], endMark)</a></h3>

支持调用方式：

<ul>
    <li><code>performance.measure(name)</code></li>
    只有一个参数时，startTime: 0, 一直到 performance.now() 之间的数据
    <li><code>performance.measure(name, startMark)</code></li>
    有 start mark, 表示是从 start mark 记录时刻到 performance.now() 之间的数据
    <li><code>performance.measure(name, startMark, endMark)</code></li>
    有 start mark 且有 end mark 表示是从 start mark - end mark 时长为两 mark 时的值的差。
    <li><code>performance.measure(name, undefined, endMark)</code></li>
    可以省略 start mark 传入 end mark， 那么 startTime = 0, 一直到 end mark 。
</ul>

返回 <a href="PerformanceMeasure">PerformanceMeasure</a> entry 记录。
<div class="mark measure" style="margin:10px 0">
    <p v-for="m in measure.log">{{m}}</p>
</div>
<el-button type="primary" plain @click="testMeasure">重置</el-button>
<el-button type="primary" plain @click="clearMeasure">清空 Measures</el-button>
<el-tree style="margin-top:20px" :data="measure.data" :render-content="renderContent"/>
`,
    setup() {
      const mark = useMark()
      const measure = useMeasure()

      Vue.onMounted(() => {
        mark.testMark()
        measure.testMeasure()
      })


      return {
        //measure
        ...measure,

        // mark
        ...mark,

        // getEntries*
        ...useMethod(),

        renderContent(h, { node, data }) {
          return h(E.ElRow, {
            style: 'width:700px'
          }, {
            default: () => [
              h(E.ElCol, {
                span: 12,
              }, {
                default: () => node.label
              }),
              h(E.ElCol, {
                span: 12
              }, {
                default: () => h('span', {
                  style: 'color:blue'
                }, data.value)
              })
            ]
          })
        }
      }
    }
  }).use(E).mount('#xmyqUZ5')

  function useMeasure() {
    // measure
    const measure = Vue.reactive({
      log: ['...'],
      data: [defaultFiltered]
    })
    function clearMeasure() {
      performance.clearMarks()
      performance.clearMeasures()
      measure.data = [defaultFiltered]
    }
    function testMeasure() {
      const ma = 'measure-marker-a'
      const mb = 'measure-marker-b'
      measure.log = ['...']
      measure.log.push(`test measure start...`)
      measure.log.push(`mark: ${ma}`)
      performance.mark(ma)
      setTimeout(() => {
        measure.log.push(`mark: ${mb}`)
        performance.mark(mb)

        setTimeout(() => {
          measure.log.push(`set measures...`)

          // 创建 measures
          performance.measure("measure a to b", ma, mb)
          performance.measure("measure a to now", ma)
          performance.measure('measure from navigation start to b', undefined, mb)
          performance.measure('measure from navigation to now')

          setTimeout(() => {
            measure.log.push(`get measures...`)
            measure.data = entries2Obj(performance.getEntriesByType('measure'))
          }, 500)
        }, 500)
      }, 500)
    }

    return { measure, clearMeasure, testMeasure }
  }

  function useMark() {
    // mark
    const mark = Vue.reactive({
      data: [defaultFiltered],
      log: [0, '', 0],
      search: ''
    })
    function searchMark() {
      if (mark.search) {
        mark.data = entries2Obj(searchEntries(mark.search, false), true)
      } else {
        mark.data = [defaultFiltered]
      }
    }
    function clearMark() {
      performance.clearMarks()
      mark.data = [defaultFiltered]
    }

    function testMark() {
      let i = 0
      timer = setInterval(() => {
        i++
        if (i === 1) {
          performance.mark('test')
          mark.log[0] = `${i}: mark start, name: test`
        } else if (i >= 150) {
          mark.log[2] = `${i}: marker end, name: test`
          clearInterval(timer)
          performance.mark('test')
        } else {
          mark.log[1] += '.'
        }
      }, 10)
    }

    return { mark, searchMark, clearMark, testMark }
  }

  function useMethod() {
    const searchMethod = Vue.ref(true)
    const data = Vue.reactive({
      tree: [],
      filtered: [defaultFiltered]
    })
    const search = Vue.ref('')
    const cached = {}
    const entries = {}
    function runSearch() {
      const val = search.value
      if (searchMethod.value) {
        data.filtered = data.tree.filter(tree => {
          const { label } = tree
          const en = entries[label] || {}
          return (label).includes(val) || en.entryType?.includes(val)
        })
      } else {
        data.filtered = (cached[val] = cached[val] || searchEntries(val))
      }
    }
    Vue.watch(search, val => {
      if (!val) {
        data.filtered = [defaultFiltered]
      }
    })

    setTimeout(() => {
      const ens = performance.getEntries()
      ens.forEach(en => (entries[en.name] = en))
      data.tree = entries2Obj(ens)
    }, 200)

    return { searchMethod, data, runSearch, search }
  }

  function searchEntries(keyword, enableFilter = true) {
    const ens = performance.getEntriesByName(keyword)
    const ets = performance.getEntriesByType(keyword)
    if (enableFilter) {
      const es = {}
      ens.forEach(en => es[en.name] = (es[en.name] || en))
      ets.forEach(en => es[en.name] = (es[en.name] || en))
      return Object.keys(es).map(key => es[key])
    }
    return [...ens, ...ets]
  }

  function entries2Obj(entries, rename = false) {
    const result = {}
    entries.forEach(en => {
      if (rename && result[en.name]) {
        result[en.name + '_' + Math.random().toString(36).substring(2, 8)] = en
      } else {
        result[en.name] = en
      }
    })
    return jsonToTreeData(result)
  }
}())
