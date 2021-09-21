const NoPriority = 0;
const ImmediatePriority = 1;
const UserBlockingPriority = 2;
const NormalPriority = 3;
const LowPriority = 4;
const IdlePriority = 5;

// Node Heap //////////////////////////////////////////////////////////////////
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

function compare(a, b) {
  // 先比较 sort index 然后比较 task id
  const diff = a.sortIndex - b.sortIndex
  return diff !== 0 ? diff : a.id - b.id
}

function scheduleCallback(priorityLevel, callback) {

}

try {
  module.exports = {
    scheduleCallback,

    // heap
    siftUp,

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
