(function() {
  const debug = document.getElementById('test101')
  // 将被监听的 DOM 元素
  const targetNode = document.getElementById('test001')
  // 监听哪些属性的变化
  const config = { attributes: true, childList: true, subtree: true }
  // 变化时执行的回调函数
  const callback = function(mutationsList, observer) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        debug.innerHTML = `<p>childList changed.</p>` + debug.innerHTML
      } else if (mutation.type === 'attributes') {
        debug.innerHTML = `<p>attributes changed.</p>` + debug.innerHTML
      }
    }
  }

  let i = 0, timer
  window.startUpdate = function(fn) {
    window.stopUpdate(0)
    debug.innerHTML = "<p>开始更新...</p>" + debug.innerHTML
    timer = setInterval(fn || (() => {
      targetNode.innerHTML = `<p>${i++}</p>`
    }), 1000)
  }


  window.stopUpdate = function(val) {
    if (val !== 0) {
      debug.innerHTML = "<p>暂停更新...</p>" + debug.innerHTML
    }
    clearInterval(timer)
  }
  // 创建一个观察者连接到 callback
  const observer = new MutationObserver(callback)
  // 开始监听
  window.startObserve = function() {
    debug.innerHTML = "<p>开始监听...</p>" + debug.innerHTML
    observer.observe(targetNode, config)
  }

  window.stopObserve = function() {
    debug.innerHTML = "<p>结束监听...</p>" + debug.innerHTML
    observer.disconnect()
  }

  window.updateAttr = function() {
    debug.innerHTML = "<p>更新 attribute ...</p>" + debug.innerHTML
    window.startUpdate(function() {
      targetNode.setAttribute('n', i++)
      targetNode.innerHTML = `<p>attribute: n = ${targetNode.getAttribute('n')}`
    })
  }
}())
