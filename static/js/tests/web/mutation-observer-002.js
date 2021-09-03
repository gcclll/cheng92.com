(function() {
  let observer, i = 0, timer
  const debug = document.getElementById('test102')
  // 将被监听的 DOM 元素
  const targetNode = document.getElementById('test002')
  // 监听哪些属性的变化
  const config = { attributes: true, childList: true, subtree: true }
  // 变化时执行的回调函数
  const callback = function(mutationsList, mutationObserver) {
    debug.innerHTML = `<p>${i}. mutationObserver === observer ? ${mutationObserver === observer}</p>` + debug.innerHTML
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        debug.innerHTML = `<p>${i}. childList changed, ${strify(mutation)}.</p>` + debug.innerHTML
      } else if (mutation.type === 'attributes') {
        debug.innerHTML = `<p>${i}. attributes changed. ${strify(mutation)}</p>` + debug.innerHTML
      }
    }
  }

  function strify(o) {
    let a = []
    for (let prop in o) {
      a.push(`${prop}=${o[prop]}`)
    }
    return a.join('&')
  }

  window.startUpdate2 = function(fn) {
    window.stopUpdate2(0)
    debug.innerHTML = "<p>开始更新...</p>" + debug.innerHTML
    timer = setInterval(fn || (() => {
      targetNode.innerHTML = `<p>${i++}</p>`
    }), 1000)
  }


  window.stopUpdate2 = function(val) {
    if (val !== 0) {
      debug.innerHTML = "<p>暂停更新...</p>" + debug.innerHTML
    }
    clearInterval(timer)
  }
  // 创建一个观察者连接到 callback
  observer = new MutationObserver(callback)
  // 开始监听
  window.startObserve2 = function() {
    debug.innerHTML = "<p>开始监听...</p>" + debug.innerHTML
    observer.observe(targetNode, config)
  }

  window.stopObserve2 = function() {
    debug.innerHTML = "<p>结束监听...</p>" + debug.innerHTML
    observer.disconnect()
  }

  window.updateAttr2 = function() {
    debug.innerHTML = "<p>更新 attribute ...</p>" + debug.innerHTML
    window.startUpdate2(function() {
      targetNode.setAttribute('n', i++)
      targetNode.innerHTML = `<p>attribute: n = ${targetNode.getAttribute('n')}`
    })
  }
}())
