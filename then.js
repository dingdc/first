/*
  Promise原型对象的then()
  指定成功和失败的回调函数
  返回一个新的promise对象
  返回promise的结果由onResolved/onRejected执行结果决定
  */
Promise.prototype.then = function(onResolved, onRejected) {
  const self = this
  // 指定回调函数的默认值（必须是函数）
  onResolved = typeof onResolved==='function' ? onResolved : value => value
  onRejected = typeof onRejected==='function' ? onRejected : reason => {throw reason}
  // 返回一个新的promise
  return new Promise((resolve, reject) => {
    /*
     执行指定的回调函数
     根据执行的结果改变这个新返回的promise的状态和数据
    */
    function handle(callback) {
      /*
        上面新返回的promise的结果由onResolved/onRejected执行结果决定
        1.抛出异常，将要返回的promise的结果为失败，reason为异常
        2.如果onResolved()返回的是一个promise，这个返回的promise的结果就是这个将要返回的promise的结果
        3.如果onResolved()返回的不是promise，将要返回的promise为成功，value为返回值
        */
      try {
        const result = callback(self.data)
        if (result instanceof Promise) { //2.
          // result.then(
          //   value => resolve(value),
          //   reason => reject(reason)
          // )
          result.then(resolve. reject) //简洁的写法
        } else { //3.
          resolve(result)
        }
      } catch (error) { //1.
        reject(error)
      }
    }
    if (self.status===RESOLVED) { //当前promise的状态是resolved
      // 立即异步执行成功的回调函数
      setTimeout(() => {
        handle(onResolved)
      })
    } else if (self.status===REJECTED) { //当前promise的状态是rejected
      // 立即异步执行成功的回调函数
      setTimeout(() => {
        handle(onRejected)
      })
    } else { //当前promise的状态是pending
      // 将成功和失败的回调函数保存到callbacks容器中缓存起来
      self.callbacks.push({
        //在resolve()/reject()中等待调用这两个函数
        onResolved (value) { //这里使用ES6中的对象字面量特性省略function
          handle(onResolved)
        },
        onRejected (reason) {
          handle(onRejected)
        }
      })
    }
  })
}