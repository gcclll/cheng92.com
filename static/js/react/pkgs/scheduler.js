const NoPriority = 0;
const ImmediatePriority = 1;
const UserBlockingPriority = 2;
const NormalPriority = 3;
const LowPriority = 4;
const IdlePriority = 5;

// Node Heap //////////////////////////////////////////////////////////////////
function push(heap, node) {
  const index = heap.length
  heap.push(node)
  siftUp(heap, node, index)
}

function peek(heap) {
  return heap.length === 0 ? null : heap[0]
}

function pop(heap) {
  if (heap.length === 0) {
    return null
  }

  const first = heap[0]
  const last = heap.pop()
  console.log('pop >> ', { first, last });
  if (last !== first) {
    heap[0] = last
    siftDown(heap, last, 0)
  }
  return first
}


function siftUp(heap, node, i) {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1
    const parent = heap[parentIndex]
    if (compare(parent, node) > 0) {
      // 找到比 node.id/sortIndex 更大的节点，然后交换
      heap[parentIndex] = node
      heap[index] = parent
      index = parentIndex
    } else {
      // 排序完成，没有更大的了
      return
    }
  }
}

function siftDown(heap, node, i) {
  let index = i
  const length = heap.length
  const halfLength = length >>> 1
  while (index < halfLength) {
    const leftIndex = (index + 1) * 2 - 1
    const left = heap[leftIndex]
    const rightIndex = leftIndex + 1
    const right = heap[rightIndex]

    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        heap[index] = right
        heap[rightIndex] = node
        index = rightIndex
      } else {
        heap[index] = left
        heap[leftIndex] = node
        index = leftIndex
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;

    } else {
      // Neither child is smaller. Exit.
      return
    }
  }
}

function compare(a, b) {
  // 先比较 sort index 然后比较 task id
  const diff = a.sortIndex - b.sortIndex
  return diff !== 0 ? diff : a.id - b.id
}

// Scheduler //////////////////////////////////////////////////////////////////
// 浏览器环境的 performance 对象, 省略其它判断...
let getCurrentTime = () => performance.now()
// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;
// Tasks are stored on a min heap
var taskQueue = [];
var timerQueue = [];

// This is set while performing work, to prevent re-entrancy.
var isPerformingWork = false;

var isHostCallbackScheduled = false;
var isHostTimeoutScheduled = false;


function scheduleCallback(priorityLevel, callback, options) {
  var currentTime = getCurrentTime()

  var startTime // 任务执行的开始时间
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay
    } else {
      startTime = currentTime
    }
  } else {
    startTime = currentTime
  }

  var timeout // 根据优化级设置超时时间
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = -1
      break
    case UserBlockingPriority:
      timeout = 250
      break
    case IdlePriority:
      // Max 31 bit integer. The max integer size in V8 for 32-bit systems.
      // Math.pow(2, 30) - 1
      // 0b111111111111111111111111111111
      timeout = 1073741823
      break
    case LowPriority:
      timeout = 10000
      break
    case NormalPriority:
      timeout = 5000
      break
  }

  // 过期时间
  var expirationTime = startTime + timeout

  // 封装新任务
  var newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1
  }

  if (startTime > currentTime) {
    // 延迟的任务，应该进入队列排队，用肇始时间做索引
    newTask.sortIndex = startTime
    push(timerQueue, newTask)
    // peek 取队列中第一个任务 queue[0]
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // queue: [null, newTask] 情况
      // 所有的任务还在排队中，且当前的 newTask 就是最早过期的那个
      if (isHostTimeoutScheduled) {
        cancelHostTimeout()
      } else {
        isHostTimeoutScheduled = true
      }
      requestHostTimeout(handleTimeout, startTime - currentTime)
    }
  } else {
    newTask.sortIndex = expirationTime
    push(taskQueue, newTask)
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true
      requestHostCallback(flushWork)
    }
  }

  return newTask
}

let isMessageLoopRunning = false;
let taskTimeoutID = -1;
// 当前正在 flush 的任务流
let scheduledHostCallback = null

// scheduler 会周期性的暂停以防主线程上有正在执行的其它工作，例如：用户事件等
// 默认情况下，每一帧会暂停多次。它并不会试图去结合帧边界，因为大多数的工作并不
// 需要这么做，如果有必要的会用 requestAnimationFrame
let yieldInterval = 5;
let deadline = 0;

// TODO: Make this configurable
// TODO: Adjust this based on priority?
const maxYieldInterval = 300;
let needsPaint = false;

const perfomrWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime()
    deadline = currentTime + yieldInterval
    const hasTimeRemaining = true

    // 如果 scheduler task 异常，退出当前的浏览器 task 以致 error 可以被观测到
    //
    // 注意不要使用 try...catch，而是要让程序继续执行下去
    let hasMoreWork = true
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime)
    } finally {
      if (hasMoreWork) {
        // 无论如何都要执行，看是不是有更多的任务待处理
        schedulePerformWorkUntilDeadline()
      } else {
        // 完成了一轮
        isMessageLoopRunning = false
        // 准备接受下一个 flushWork
        scheduledHostCallback = null
      }
    }
  } else {
    // 标记当前空闲
    isMessageLoopRunning = false
  }

  // 暂停，会使浏览器有机会去渲染，所以要重围
  needsPaint = false
}
// 省略环境的检查，直接使用 DOM 和 Worker 环境，注释中说更
// 偏向用 MessageChannel 是因为 setTimeout 4ms 的问题
// 原本的检查优化级： setImmediate > MessageChannel > setTimeout
let schedulePerformWorkUntilDeadline = (() => {
  const channel = new MessageChannel()
  const port = channel.port2
  channel.port1.onmessage = performWorkUntilDealine
  return () => port.postMessage(null)
})()

function requestHostCallback(callback/*flushWork*/) {
  // 保存将来恢复用?
  scheduledHostCallback = callback
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true
    schedulePerformWorkUntilDeadline()
  }
}

function cancelHostTimeout() {
  clearTimeout(taskTimeoutID)
  taskTimeoutID = -1
}

function requestHostTimeout(callback, ms) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime())
  }, ms)
}

try {
  module.exports = {
    scheduleCallback,

    // heap
    siftUp,
    siftDown,
    push,
    pop,
    peek,

    // priorities
    NoPriority,
    ImmediatePriority,
    UserBlockingPriority,
    NormalPriority,
    LowPriority,
    IdlePriority
  }
} catch (e) {
  console.warn('not in node environment.')
}
