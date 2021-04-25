
function VuexPersistence(options = {}) {
  // 创建一个队列管理器实例
  const _mutex = new SimplePromiseQueue()

  this.key = options.key ?? 'vuex'

  this.subscribed = false
  this.mergeOption = options.mergeOption || 'replaceArrays'


  let localStorateLitmus = true
  // 支不支持 H5 storage api
  try {
    window.localStorage.getItem('')
  } catch (err) {
    localStorageLitmus = false
  }

  // 几种 storage 存储机制
  // 1. 用户定义的
  // 2. H5 storage api localStorage
  // 3. mock storage 内存里的一个全局变量
  // 4. 都不是应该报错
  if (options.storage) {
    this.storage = options.storage
  }

}

function SimplePromiseQueue() {
  this._queue = []
  this._flushing = false
}

const SPQ = SimplePromiseQueue
const SPGP = SimplePromiseQueue.prototype

// 入列，如果没有任务正在执行，立即 flush
SPGP.enqueue = function enqueue(promise) {
  this._queue.push(promise)
  if (!this._flushing) return this.flushQueue()
  return Promise.resolve()
}

SPGP.flushQueue = function flushQueue() {
  this._flushing = true

  const chain = () => {
    const nextTask = this._queue.shift() // 先进先出
    if (nextTask) {
      // 递归，flush 所有任务
      return nextTask.then(chain)
    }

    this._flushing = false
  }
  return Promise.resolve(chain())
}
