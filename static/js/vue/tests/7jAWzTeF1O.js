(function() {
  const { watch, h, createApp, defineComponent, onMounted, onUpdated, ref, reactive } = Vue
  const { ElButton } = ElementPlus
  const { log, Log } = useLog({ unshift: true })
  const { Description, setDesc } = useDescription({ html: true, display: 'block', desc: '点击下面的按钮查看相关信息。' })

  const diff = (oldVal, newVal, i) => {
    domDiffProps(oldVal, newVal, { annotated: false, v: 'visual00' + i })
  }

  const Child = defineComponent({
    props: {
      foo: Number,
      bar: [Boolean],
      baz: [Boolean, String],
      bax: [Boolean], // parent 没传这个属性的时候，初始化成 false
      baa: {
        default: 100,
        type: Number
      },
      bas: {
        default: function() {
          return 'bas'
        },
        type: String
      },
    },
    setup(props, { attrs }) {
      onMounted(() => {
        log('child component mounted', { props, attrs })
      })
      onUpdated(() => {
        log('>>> child updated, props = ', props, '>>> child updated, attrs = ', attrs)
      })
    },
    render() {
      return h('p', 'child component...')
    }
  })

  const propsFromParent = reactive({
  })
  const Parent = defineComponent({
    setup() {
      onMounted(() => log('parent component mounted'))
    },
    render() {
      return h('p', [
        'parent component...',
        h(Child, {
          ...propsFromParent,
          onVnodeUpdated: (newVnode, oldVnode) => {
            diff(oldVnode.props, newVnode.props, 1)
            log(...[
              '--- child vnode updated---',
              'new = ' + obj2json(newVnode.props),
              'old = ' + obj2json(oldVnode.props),
            ])
          }
        })
      ])
    }
  })

  function addProp(name, value, desc) {
    propsFromParent[name] = value
    setDesc(desc)
  }

  const genButton = (name, value, desc) => h(ElButton, {
    onClick: () => addProp(name, value, desc), type: 'primary', style: {
      marginBottom: '10px'
    }
  }, {
    default: () => `add ${name}=${value}`
  })

  const Root = defineComponent({
    render() {
      return h('div', null, [
        h(Parent),
        h(Description),
        h('div', {
          style: { display: 'flex', 'justify-content': 'space-between' }
        }, [
          h('div', ['props 变化',
            h('div', { id: 'visual001' })
          ]),
          h('div', [
            'attrs 变化',
            h('div', { id: 'visual002' })
          ])
        ]),
        genButton('name', 'child', `options api props 中没有声明，当做 attrs 处理。`),
        genButton('ref', 'childEle', `ref 和 key 为不下传的属性，只作用域当前组件节点本身的属性。`),
        genButton('xref', 'child xref', `如同 "name" 当做 attrs 处理，这里只是为了区别 "ref" 增加的测试项。`),
        genButton('foo', 100, `options api props 中有声明的 { props: ['foo'] }，当做 props 处理。`),
        genButton('bar', '', `
options api props 有声明，
${toCode(`
props: {
  foo: Number,
  bar: [Boolean]
}\n`)}
且是 Boolean 类型，值为 '' 的转成 true 值，如源码：
${codeBooleanCast()}`),
        Log
      ])
    }
  })

  createApp(Root).mount('#x7jAWzTeF1O')
}())

function codeBooleanCast() {
  const link = `<a target="_blank" href="https://github.com/vuejs/vue-next/tree/master/packages/runtime-core/src/componentProps.ts">resolvePropValue()</a>`
  return link +
    toCode(`
// boolean casting, resolvePropValue()
if (opt[BooleanFlags.shouldCast]) {
  // 这种情况属于 parent 中没有向 child 传递属性
  // 但是 child 组件内部有对应属性的声明时候，会被初始化成 false
  // 如： { props: ['bax'] }, <Child foo=1/>
  if (!hasOwn(props, key) && !hasDefault) {
    value = false
  } else if (
    // 这里只有 Boolean 类型时则是 shouldCastTrue
    // 且值是空字符串的时候，当做 true 处理
    opt[BooleanFlags.shouldCastTrue] &&
    (value === '' || value === hyphenate(key))
  ) {
    value = true
  }
}`)
}

function toCode(s) {
  return preCodeString(s.replace(/[\n\r]/g, '<br/>').replace(/\s/g, '&nbsp;&nbsp;'))
}
