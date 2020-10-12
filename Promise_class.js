/*
  类版本
  自定义Promise函数模块：IIFE
*/
(function(window) {
  const PENDING = 'pending'
  const RESOLVED = 'resolved'
  const REJECTED = 'rejected'

  class Promise {
    /*
    Promise构造函数
    excutor: 执行器函数(同步执行)
    */
    constructor (excutor) {
      // 将当前Promise对象保存起来
      const self = this
      self.status = PENDING // 给promise对象指定status属性，初始值为pending
      self.data = undefined // 给promise对象指定一个用于存储结果数据的属性
      self.callbacks = [] // 每个元素的结构： {onResolved() {}, onRejected() {}}
      function resolve(value) {
        // 如果当前状态不是pending，直接结束
        if (self.status!==PENDING) {
          return
        }
        // 将状态改为resolved
        self.status = RESOLVED
        // 保存value数据
        self.data = value
        // 如果有待执行的callback函数，立即异步执行回调函数onResolved
        if (self.callbacks.length>0) {
          setTimeout(() => { // 放入队列中执行所有成功的回调
            self.callbacks.forEach(callbacksObj => {
              callbacksObj.onResolved(value)
            })
          })
        }
      }

      function reject(reason) {
        // 如果当前状态不是pending，直接结束
        if (self.status!==PENDING) {
          return
        }
        // 将状态改为rejected
        self.status = REJECTED
        // 保存value数据
        self.data = reason
        // 如果有待执行的callback函数，立即异步执行回调函数onRejected
        if (self.callbacks.length>0) {
          setTimeout(() => { // 放入队列中执行所有失败的回调
            self.callbacks.forEach(callbacksObj => {
              callbacksObj.onRejected(reason)
            })
          })
        }
      }
      
      //立即同步执行excutor函数
      try {
        excutor(resolve, reject)
      } catch (error){ // 如果执行器抛出异常，promise对象变为rejected状态
        reject(error)
      }
    }

    
    /*
    Promise原型对象的then()
    指定成功和失败的回调函数
    返回一个新的promise对象
    */
    then (onResolved, onRejected) {
      onResolved = typeof onResolved === 'function' ? onResolved : value => value // 向后传递成功的value
      // 指定默认的失败的回调（实现错误/异常穿透的关键点）
      onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason} // 向后传递失败的reason
      const self = this
      // 返回一个新的promise对象
      return new Promise((resolve, reject) => {
        /*
        调用指定的回调函数处理
        */
        function handle(callback) {
          /*
            1. 如果抛出异常，return的promise就会失败，reason就是error
            2. 如果回调函数执行返回的不是promise，return的promise就会成功，value就是返回的值
            3. 如果回调函数执行返回的是promise，return的promise的结果就是这个promise的结果
            */
          try {
            const result = callback(self.data)
            if (result instanceof Promise) { // 第三种情况
              result.then(
                value => resolve(value), // 当result成功时，让return的promise也成功
                reason => reject(reason) // 当result失败时，让return的promise也失败
              )
              // result.then(resolve, reject) // 简洁的写法
            } else { //第二种情况
              resolve(result)
            }
          } catch (error) { // 第一种情况
            reject(error)
          }
        }
        if (self.status===PENDING) { // 如果当前状态还是pending状态，将回调函数保存起来
          self.callbacks.push({
            onResolved(value) {
              handle(onResolved)
            },
            onRejected(reason) {
              handle(onRejected)
            }
          })
        } else if (self.status===RESOLVED) { // 如果当前状态已经改变为resolved状态，异步执行onResolved并改变return的promise状态
          setTimeout(() => {
            handle(onResolved)
          })
        } else { // 如果当前状态已经改变为rejected状态，异步执行onRejected并改变return的promise状态
          setTimeout(() => {
            handle(onRejected)
        })
        }
      })
    }

    /*
    Promise原型对象的catch()
    指定成功和失败的回调函数
    返回一个新的promise对象
    */
    catch (onRejected) {
      return this.then(undefined, onRejected);
    }

    /*
    Promise函数对象的resolve方法
    返回一个指定结果的成功的promise
    */
    static resolve = function(value) {
      // 返回一个成功/失败的promise
      return new Promise((resolve, reject) => {
        if (value instanceof Promise) { // value是promise，使用value的结果作为new的promise的结果
          value.then(resolve, reject)
        } else { // value不是promise => promise变为成功，数据是value
          resolve(value)
        }
      })
    }

    /*
    Promise函数对象的reject方法
    返回一个指定reason的失败的promise
    */
    static reject = function(reason) {
      // 返回一个失败的promise
      return new Promise((resolve, reject) => {
        reject(reason)
      })
    }

    /*
    Promise函数对象的all方法
    返回一个promise，只有当所有promise都成功时才成功，否则只要有一个失败的就失败
    */
    static all = function(promises) {
      // 用来保存成功promise的数量
      let resolvedCount = 0
      // 用来保存所有成功value的数组
      const values = new Array(promises.length)
      // 返回一个新的promise
      return new Promise((resolve, reject) => {
        // 遍历promises获取每个promise的结果
        promises.forEach((p, index) => {
          Promise.resolve(p).then( // 将p用Promise.resolve()包裹起来使得p可以是一个值
            value => {
              resolvedCount++ // 成功的数量加1
              // p成功，将成功的value按顺序保存到values
              values[index] = value
              // 如果全部成功了。将return的promise改为成功
              if(resolvedCount===promises.length) {
                resolve(values)
              }
          },
          reason => { // 只要有一个失败了，return的promise就失败
            reject(reason)
          });
        })
      })
    }

    /*
    Promise函数对象的all方法
    返回一个promise，其结果由第一个完成的promise决定
    */
    static race = function(promises) {
      // 返回一个promise
      return new Promise((resolve, reject) => {
        // 遍历promises获取每个promise的结果
        promises.forEach((p, index) => { // 只有第一次调用的有效果
          Promise.resolve(p).then(
            value => { // 一旦有成功，将return的promise变为成功
              resolve(value) 
          },
          reason => { // 一旦有失败，将return的promise变为失败
            reject(reason)
          });
        })
      })
    }

    /*
    返回一个promise对象，它在指定的时间后才确定结果
    (在Promise.resolve()上加setTimeout)
    */
    static resolveDelay = function(value, time) {
      // 返回一个成功/失败的promise
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (value instanceof Promise) {// value是promise，使用value的结果作为new的promise的结果
            value.then(resolve, reject)
          } else { // value不是promise => promise变为成功，数据是value
            resolve(value)
          }
        }, time)
        
      })
    }

    /*
    返回一个promise对象，它在指定的时间后才失败
    */
    static rejectDelay = function(reason, time) {
      // 返回一个失败的promise
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(reason)
        }, time)
      })
    }


  }

  window.Promise = Promise // 向外暴露Promise
})(window)