export enum States {
    PENDING = "pending",
    FULFILLED = "fulfilled",
    REJECTED = "rejected",
}

export interface Resolve<T> {
    (value: T | PromiseLike<T>): void;
}

export interface Reject {
    (reason?: any): void;
}

export interface Executor<T> {
    (resolve: Resolve<T>, reject: Reject): void;
}

//  PromisesA+ 1.1
export interface PromiseLike<T> {
    then<TResult1 = T, TResult2 = never>(
        //  PromisesA+ 2.2.1
        onFulfilled?: ((value: T | PromiseLike<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): PromiseLike<TResult1 | TResult2>;
}

export class MyPromise<T> {
    private state: States = States.PENDING;
    private onFulfilledCbs = [] as (() => void)[]; //  成功时的回调函数
    private onRejectedCbs = [] as (() => void)[]; //  失败时的回调函数
    private value!: T | PromiseLike<T>;
    private reason: any;

    constructor(executor: Executor<T>) {
        try {
            executor(this.resolve, this.reject);
        } catch (e) {
            // PromisesA + 1.4
            this.reject(e);
        }
    }

    //  PromisesA+ 1.3 | PromisesA+ 2.1
    private resolve: Resolve<T> = (value: T | PromiseLike<T>) => {
        try {
            //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
            setTimeout(() => {
                if (this.state === States.PENDING) {
                    this.state = States.FULFILLED;
                    this.value = value;
                    //  PromisesA+ 2.2.6.1
                    this.onFulfilledCbs.forEach((fn) => fn());
                    this.onFulfilledCbs = [];
                }
            });
        } catch (e) {
            this.reject(e);
        }
    };

    // PromisesA+ 1.5
    private reject: Reject = (reason: any) => {
        try {
            //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
            setTimeout(() => {
                if (this.state === States.PENDING) {
                    this.state = States.REJECTED;
                    this.reason = reason;
                    //  PromisesA+ 2.2.6.2
                    this.onRejectedCbs.forEach((fn) => fn());
                    this.onRejectedCbs = [];
                }
            });
        } catch (e) {
            this.reject(e);
        }
    };

    //  PromisesA+ 1.2 | PromisesA+ 2.2
    then<TResult1 = T, TResult2 = never>(
        //  PromisesA+ 2.2.1
        onFulfilled?: ((value: T | PromiseLike<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): MyPromise<TResult1 | TResult2> {
        //  PromisesA+ 2.2.5 | PromisesA+ 2.2.7.3 | PromisesA+ 2.2.7.4
        onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (val: T | PromiseLike<T>) => val as any;
        onRejected =
            typeof onRejected === "function"
                ? onRejected
                : (r: any) => {
                      throw r;
                  };
        //  PromisesA+ 2.2.7
        const promise2 = new MyPromise<TResult1 | TResult2>((resolve: Resolve<TResult1 | TResult2>, reject: Reject) => {
            if (this.state === States.FULFILLED) {
                //  PromisesA+ 2.2.2
                //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
                setTimeout(() => {
                    try {
                        //  PromisesA+ 2.2.7.1
                        let x = onFulfilled!(this.value);
                        this.resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        //  PromisesA+ 2.2.7.2
                        reject(e);
                    }
                });
            } else if (this.state === States.REJECTED) {
                //  PromisesA+ 2.2.3
                //  PromisesA+ 2.2.4 异步调用，用setTimeout模拟创建微任务
                setTimeout(() => {
                    try {
                        //  PromisesA+ 2.2.7.1
                        let x = onRejected!(this.reason);
                        this.resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        //  PromisesA+ 2.2.7.2
                        reject(e);
                    }
                });
            } else if (this.state === States.PENDING) {
                //  PromisesA+ 2.2.6
                //  调用回调函数时是异步的，因此这里不再需要加setTimeout
                this.onFulfilledCbs.push(() => {
                    try {
                        let x = onFulfilled!(this.value);
                        //  PromisesA+ 2.2.7.1
                        this.resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                });
                this.onRejectedCbs.push(() => {
                    try {
                        let x = onRejected!(this.reason);
                        //  PromisesA+ 2.2.7.1
                        this.resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        });
        return promise2;
    }

    resolvePromise<T>(promise: MyPromise<T>, x: T | PromiseLike<T>, resolve: Resolve<T>, reject: Reject) {
        //  PromisesA+ 2.3.1
        if (promise === x) {
            const e = new TypeError("TypeError: Circular reference");
            reject(e);
        }
        let called = false; //  防止resolve和reject多次调用
        //  PromisesA+ 2.3.3
        if (x && (typeof x === "object" || typeof x === "function")) {
            try {
                //  PromisesA+ 2.3.3.1 | PromisesA+ 2.3.2
                const then = (x as PromiseLike<T>).then;
                if (typeof then === "function") {
                    then.call(
                        x,
                        //  PromisesA+ 2.3.3.3.1
                        (y: T | PromiseLike<T>) => {
                            //  PromisesA+ 2.3.3.3.3
                            if (called) return;
                            called = true;
                            //  直到解析的对象不再是 thenable，取出其中的值
                            this.resolvePromise(promise, y, resolve, reject);
                        },
                        //  PromisesA+ 2.3.3.3.2
                        (r: any) => {
                            //  PromisesA+ 2.3.3.3.3
                            if (called) return;
                            called = true;
                            reject(r);
                        }
                    );
                } else {
                    //  PromisesA+ 2.3.3.4
                    resolve(x);
                }
            } catch (e) {
                //  PromisesA+ 2.3.3.2 | PromisesA+ 2.3.3.3.3 | PromisesA+ 2.3.3.3.4
                if (called) return;
                called = true;
                reject(e);
            }
        } else {
            //  PromisesA+ 2.3.4
            resolve(x);
        }
    }
}

// @ts-ignore
MyPromise.deferred = function () {
    let deferred: any = {};
    deferred.promise = new MyPromise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    return deferred;
};

// @ts-ignore
// export = MyPromise;
