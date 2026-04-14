// Central undo stack — last 10 actions, any component can push/pop

const MAX = 10
let stack = []
let listeners = []

export const undoStack = {
  push(action) {
    // action = { label, undo: async fn }
    stack = [action, ...stack].slice(0, MAX)
    listeners.forEach(fn => fn(stack))
  },
  pop() {
    const [action, ...rest] = stack
    stack = rest
    listeners.forEach(fn => fn(stack))
    return action
  },
  peek() { return stack[0] ?? null },
  clear() { stack = []; listeners.forEach(fn => fn(stack)) },
  subscribe(fn) {
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
  },
  get length() { return stack.length },
}
