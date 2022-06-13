import { Resolve, Reject, MyPromise, PromiseLike } from "./promise";

export function resolve<T>(value: T | PromiseLike<T>): MyPromise<T> {
    // 如果 value 是一个 MyPromise 实例，那么直接返回 value。
    if (value instanceof MyPromise) return value;
    if (
        (typeof value === "object" || typeof value === "function") &&
        "then" in value &&
        typeof value.then === "function"
    ) {
        // 如果 value 是一个 thenable，将它转换成 MyPromise 对象；
        return new MyPromise<T>((_resolve, _reject) => value.then(_resolve, _reject));
    }
    //	如果 value 不是上述两种情况，返回一个用 value 解决的 Promise。
    return new MyPromise<T>((_resolve: Resolve<T>) => {
        _resolve(value);
    });
}

export function reject(reason: any) {
    return new MyPromise((_, _reject: Reject) => {
        _reject(reason);
    });
}

interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}

export function all<T>(promises: Iterable<T | PromiseLike<T>>): MyPromise<any[]> {
    let results = [] as T[]; // 作为返回值的 Promise 的 value
    let promiseCnt = 0;
    let promiseLen = "length" in promises ? Reflect.get(promises, "length") : Reflect.get(promises, "size");
    return new MyPromise((_resolve: Resolve<T[]>, _reject: Reject) => {
        for (let p of promises) {
            // 可迭代对象中的未必一定是 PromiseLike，因此 Promise.resolve 方法进行处理
            resolve(p).then(
                (val) => {
                    results.push(val as T);
                    ++promiseCnt;
                    if (promiseCnt === promiseLen) _resolve(results);
                },
                (err) => {
                    _reject(err);
                }
            );
        }
    });
}

export function race<T>(promises: Iterable<T | PromiseLike<T>>): MyPromise<any> {
    return new MyPromise((_resolve: Resolve<T>, _reject: Reject) => {
        for (let p of promises) {
            resolve(p).then(_resolve, _reject);
        }
    });
}
