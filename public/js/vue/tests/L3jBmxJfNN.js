(function() {
  const { h, createApp, ref, reactive, defineComponent, onUpdated, onBeforeUpdate } = Vue
  const { ElButton, ElCard } = ElementPlus
  const { log, Log } = useLog()

  const parentBgColor = ref('blue')
  const bgcolor = ref('')
  function changeParentColor() {
    parentBgColor.value = parentBgColor.value === 'blue' ? 'green' : 'blue'
  }

  function changeParentColorWithProp() {
    changeParentColor()
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
        },
        onVnodeUpdated(newVnode, oldVnode) {
          log('child vnode updated, new: ' + newVnode.props.style.background + ', old: ' + oldVnode.props.style.background)
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
        },
        onVnodeUpdated(newVnode, oldVnode) {
          log('parent vnode updated, new: ' + newVnode.props.style.background + ', old: ' + oldVnode.props.style.background)
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
        h(ElButton, { type: "danger", onClick: changeParentColorWithProp }, {
          default: () => '改变父子组件背景色'
        }),
        Log
      ])
    }
  })

  createApp(Root).use(ElementPlus).mount('#L3jBmxJfNN')
}())
