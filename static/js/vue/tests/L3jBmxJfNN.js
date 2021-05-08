(function() {
  const { h, createApp, ref, reactive, defineComponent, onUpdated, onBeforeUpdate } = Vue
  const { ElButton, ElCard } = ElementPlus
  const logs = reactive(['测试日志：'])
  const log = m => logs.push(typeof m === 'object' ? JSON.stringify(m) : m)

  const parentBgColor = ref('blue')
  const bgcolor = ref('')
  function changeParentColor() {
    parentBgColor.value = parentBgColor.value === 'blue' ? 'green' : 'blue'
    bgcolor.value = bgcolor.value === 'black' ? 'coral' : 'black'
  }

  const childBgColor = ref('coral')
  function changeChildColor() {
    bgcolor.value = ''
    childBgColor.value = childBgColor.value === 'coral' ? 'teal' : 'coral'
  }


  const Child = defineComponent({
    setup() {
      onUpdated(() => log('child updated'))
      onBeforeUpdate(() => log('child before update'))
    },
    render() {
      const { bgcolor } = this.$attrs
      return h('p', {
        style: {
          background: bgcolor.value || childBgColor.value,
        }
      }, '我是子组件')
    }
  })


  const Parent = defineComponent({
    setup() {
      onUpdated(() => log('parent updated'))
      onBeforeUpdate(() => log('parent before update'))
    },
    render() {
      return h('p', {
        style: {
          background: parentBgColor.value,
          color: 'white',
          padding: '5px 10px'
        }
      }, [
        '父组件',
        h(Child, {
          bgcolor
        })
      ])
    }
  })

  const Root = defineComponent({
    render() {
      return h('div', [
        h(Parent),
        h(ElButton, { type: "primary", onClick: changeParentColor }, {
          default: () => '改变父组件背景色'
        }),
        h(ElButton, { type: "warning", onClick: changeChildColor }, {
          default: () => '改变子组件背景色'
        }),
        h(ElCard, {
          style: { marginTop: '5px' }
        }, {
          default: () => logs.map(log => h('div', log))
        })
      ])
    }
  })

  createApp(Root).use(ElementPlus).mount('#L3jBmxJfNN')
}())
