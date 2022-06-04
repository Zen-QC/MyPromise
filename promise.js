"use strict";
exports.MyPromise = void 0;
var States;
(function (States) {
    States["PENDING"] = "pending";
    States["FULFILLED"] = "fulfilled";
    States["REJECTED"] = "rejected";
})(States || (States = {}));
var MyPromise = /** @class */ (function () {
    function MyPromise(executor) {
        var _this = this;
        this.state = States.PENDING;
        this.onFulfilledCbs = []; //  成功时的回调函数
        this.onRejectedCbs = []; //  失败时的回调函数
        //  PromisesA+ 1.3 | PromisesA+ 2.1
        this.resolve = function (value) {
            try {
                //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
                setTimeout(function () {
                    if (_this.state === States.PENDING) {
                        _this.state = States.FULFILLED;
                        _this.value = value;
                        //  PromisesA+ 2.2.6.1
                        _this.onFulfilledCbs.forEach(function (fn) { return fn(); });
                        _this.onFulfilledCbs = [];
                    }
                });
            }
            catch (e) {
                _this.reject(e);
            }
        };
        // PromisesA+ 1.5
        this.reject = function (reason) {
            try {
                //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
                setTimeout(function () {
                    if (_this.state === States.PENDING) {
                        _this.state = States.REJECTED;
                        _this.reason = reason;
                        //  PromisesA+ 2.2.6.2
                        _this.onRejectedCbs.forEach(function (fn) { return fn(); });
                        _this.onRejectedCbs = [];
                    }
                });
            }
            catch (e) {
                _this.reject(e);
            }
        };
        try {
            executor(this.resolve, this.reject);
        }
        catch (e) {
            // PromisesA + 1.4
            this.reject(e);
        }
    }
    //  PromisesA+ 1.2 | PromisesA+ 2.2
    MyPromise.prototype.then = function (
    //  PromisesA+ 2.2.1
    onFulfilled, onRejected) {
        var _this = this;
        //  PromisesA+ 2.2.5 | PromisesA+ 2.2.7.3 | PromisesA+ 2.2.7.4
        onFulfilled = typeof onFulfilled === "function" ? onFulfilled : function (val) { return val; };
        onRejected =
            typeof onRejected === "function"
                ? onRejected
                : function (r) {
                    throw r;
                };
        //  PromisesA+ 2.2.7
        var promise2 = new MyPromise(function (resolve, reject) {
            if (_this.state === States.FULFILLED) {
                //  PromisesA+ 2.2.2
                //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
                setTimeout(function () {
                    try {
                        //  PromisesA+ 2.2.7.1
                        var x = onFulfilled(_this.value);
                        _this.resolvePromise(promise2, x, resolve, reject);
                    }
                    catch (e) {
                        //  PromisesA+ 2.2.7.2
                        reject(e);
                    }
                });
            }
            else if (_this.state === States.REJECTED) {
                //  PromisesA+ 2.2.3
                //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
                setTimeout(function () {
                    try {
                        //  PromisesA+ 2.2.7.1
                        var x = onRejected(_this.reason);
                        _this.resolvePromise(promise2, x, resolve, reject);
                    }
                    catch (e) {
                        //  PromisesA+ 2.2.7.2
                        reject(e);
                    }
                });
            }
            else if (_this.state === States.PENDING) {
                //  PromisesA+ 2.2.6
                //  调用回调函数时是异步的，因此这里不再需要加setTimeout
                _this.onFulfilledCbs.push(function () {
                    try {
                        var x = onFulfilled(_this.value);
                        //  PromisesA+ 2.2.7.1
                        _this.resolvePromise(promise2, x, resolve, reject);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
                _this.onRejectedCbs.push(function () {
                    try {
                        var x = onRejected(_this.reason);
                        //  PromisesA+ 2.2.7.1
                        _this.resolvePromise(promise2, x, resolve, reject);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }
        });
        return promise2;
    };
    MyPromise.prototype.resolvePromise = function (promise, x, resolve, reject) {
        var _this = this;
        //  PromisesA+ 2.3.1
        if (promise === x) {
            var e = new TypeError("TypeError: Circular reference");
            reject(e);
        }
        var called = false; //  防止resolve和reject多次调用
        //  PromisesA+ 2.3.3
        if (x && (typeof x === "object" || typeof x === "function")) {
            try {
                //  PromisesA+ 2.3.3.1 | PromisesA+ 2.3.2
                var then = x.then;
                if (typeof then === "function") {
                    then.call(x, 
                    //  PromisesA+ 2.3.3.3.1
                    function (y) {
                        //  PromisesA+ 2.3.3.3.3
                        if (called)
                            return;
                        called = true;
                        //  直到解析的对象不再是 thenable，取出其中的值
                        _this.resolvePromise(promise, y, resolve, reject);
                    }, 
                    //  PromisesA+ 2.3.3.3.2
                    function (r) {
                        //  PromisesA+ 2.3.3.3.3
                        if (called)
                            return;
                        called = true;
                        reject(r);
                    });
                }
                else {
                    //  PromisesA+ 2.3.3.4
                    resolve(x);
                }
            }
            catch (e) {
                //  PromisesA+ 2.3.3.2 | PromisesA+ 2.3.3.3.3 | PromisesA+ 2.3.3.3.4
                if (called)
                    return;
                called = true;
                reject(e);
            }
        }
        else {
            //  PromisesA+ 2.3.4
            resolve(x);
        }
    };
    return MyPromise;
}());
// @ts-ignore
MyPromise.deferred = function () {
    var deferred = {};
    deferred.promise = new MyPromise(function (resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    return deferred;
};
module.exports = MyPromise;
