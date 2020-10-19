const Promise = require("./promise.js").MyPromise;
const delay = (fn, t) => setTimeout(fn, t);
const log = (...args) => console.log.apply(console, args);

describe("Promise", () => {
  test("Promise then resolve", () => {
    return new Promise((resolve) => delay(() => resolve(100))).then((value) =>
      expect(value).toBe(100)
    );
  });
  test("Promise then reject", () => {
    return new Promise((_, reject) =>
      delay(() => reject("test reject"))
    ).then(null, (reason) => expect(reason).toBe("test reject"));
  });

  test("Promise catch", () => {
    return new Promise((resolve) => delay(() => resolve(100)))
      .then(() => a /* a is not defined */)
      .catch((err) => expect(err.message).toBe("a is not defined"));
  });

  test("Promise finally", () => {
    return new Promise((resolve) => delay(() => resolve(100)))
      .then((value) => 200)
      .finally((result) => expect(result).toBe(200));
  });

  test("Promise finally with catch", () => {
    return new Promise((resolve) => delay(() => resolve(100)))
      .then((value) => a)
      .catch((err) => err.message)
      .finally((result) => expect(result).toBe("a is not defined"));
  });

  test("Promise all", () => {
    const p1 = new Promise((resolve) => delay(() => resolve(100), 100));
    const p2 = new Promise((_, reject) => delay(() => reject(200), 200));
    const p3 = new Promise((_, reject) => delay(() => reject(300), 80));
    const p4 = new Promise((resolve) => delay(() => resolve(400), 120));

    let pa1 = Promise.all([p1, p4]).then((value) => value);
    let pa2 = Promise.all([p1, p2]).then(null, (reason) => reason);
    let pa3 = Promise.all([p2, p3]).then(null, (reason) => reason);
    return Promise.allSettled([pa1, pa2, pa3]).then((value) =>
      expect(value).toStrictEqual([[100, 400], 200, 300])
    );
  });

  test("Promise allSettled", () => {
    const p1 = new Promise((resolve) => delay(() => resolve(100), 100));
    const p2 = new Promise((_, reject) =>
      delay(() => reject("p2 reject"), 200)
    );
    const p3 = new Promise((resolve) => delay(() => resolve(300), 120));

    return Promise.allSettled([p1, p2, p3]).then((value) =>
      expect(value).toStrictEqual([100, "p2 reject", 300])
    );
  });

  test("Promise race resolve", () => {
    const p1 = new Promise((resolve) => delay(() => resolve(100), 100));
    const p2 = new Promise((_, reject) =>
      delay(() => reject("p2 reject"), 200)
    );
    return Promise.race([p2, p1]).then((value) => expect(value).toBe(100));
  });

  test("Promise race reject", () => {
    const p1 = new Promise((resolve) => delay(() => resolve(100), 100));
    const p2 = new Promise((_, reject) => delay(() => reject("p2 reject"), 80));
    return Promise.race([p2, p1]).then(null, (reason) =>
      expect(reason).toBe("p2 reject")
    );
  });

  test("Promise any resolve", () => {
    const p1 = new Promise((resolve) => delay(() => resolve(100), 100));
    const p2 = new Promise((_, reject) => delay(() => reject("p2 reject"), 80));
    const p3 = new Promise((_, reject) => delay(() => reject("p3 reject"), 80));
    return Promise.any([p2, p1, p3]).then((value) => expect(value).toBe(100));
  });

  test("Promise any reject", () => {
    const p1 = new Promise((resolve) => delay(() => resolve(100), 100));
    const p2 = new Promise((_, reject) => delay(() => reject("p2 reject"), 80));
    const p3 = new Promise((_, reject) => delay(() => reject("p3 reject"), 80));
    return Promise.any([p2, p3]).then(null, (value) =>
      expect(value).toStrictEqual(["p2 reject", "p3 reject"])
    );
  });
});
