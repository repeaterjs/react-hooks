import { act } from "react-test-renderer";
import { Repeater } from "@repeaterjs/repeater";
import { renderHook } from "@testing-library/react-hooks";
import { useAsyncIter, useRepeater, useResult, useValue } from "../react-hooks";

describe("useRepeater", () => {
  test("basic", async () => {
    const { result } = renderHook(() => {
      return useRepeater();
    });

    const [repeater, push, stop] = result.current;
    expect(repeater).toBeDefined();
    expect(push).toBeDefined();
    expect(stop).toBeDefined();
    push(1);
    expect(await repeater.next()).toEqual({ value: 1, done: false });
    push(2);
    expect(await repeater.next()).toEqual({ value: 2, done: false });
    push(3);
    push(4);
    expect(await repeater.next()).toEqual({ value: 3, done: false });
    expect(await repeater.next()).toEqual({ value: 4, done: false });
    stop();
    expect(await repeater.next()).toEqual({ done: true });
  });
});

describe("useAsyncIter", () => {
  test("basic", async () => {
    const callback = jest.fn(async function*(): AsyncIterableIterator<number> {
      yield 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield 2;
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield 3;
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield 4;
    });

    const { result, rerender } = renderHook(() => {
      return useAsyncIter(callback);
    });

    expect(await result.current.next()).toEqual({ value: 1, done: false });
    rerender();
    expect(await result.current.next()).toEqual({ value: 2, done: false });
    rerender();
    expect(await result.current.next()).toEqual({ value: 3, done: false });
  });

  test("unmount", async () => {
    const callback = jest.fn(async function*(): AsyncIterableIterator<number> {
      yield 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield 2;
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield 3;
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield 4;
    });

    const { result, unmount } = renderHook(() => {
      return useAsyncIter(callback);
    });

    expect(await result.current.next()).toEqual({ value: 1, done: false });
    unmount();
    expect(await result.current.next()).toEqual({ done: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("deps", async () => {
    const callback = jest.fn(async function*(
      deps: AsyncIterableIterator<[number]>,
    ): AsyncIterableIterator<number> {
      for await (const [num] of deps) {
        yield num ** 2;
      }
    });

    const { result, rerender } = renderHook(
      (props) => {
        return useAsyncIter(callback, [props.num]);
      },
      { initialProps: { num: 1 } },
    );

    expect(await result.current.next()).toEqual({ value: 1, done: false });
    rerender({ num: 2 });
    expect(await result.current.next()).toEqual({ value: 4, done: false });
    rerender({ num: 3 });
    rerender({ num: 4 });
    expect(await result.current.next()).toEqual({ value: 9, done: false });
    expect(await result.current.next()).toEqual({ value: 16, done: false });
  });
});

describe("useResult", () => {
  test("basic", async () => {
    let push: (value: number) => Promise<void>;
    let stop: (() => void) & Promise<void>;
    const repeater = new Repeater(async (push1, stop1) => {
      push = push1;
      stop = stop1;
      return -1;
    });

    const callback = jest.fn(() => {
      return repeater;
    });

    const { result } = renderHook(() => {
      return useResult(callback);
    });

    expect(result.current).toBeUndefined();
    await act(() => push(1));
    expect(result.current).toEqual({ value: 1, done: false });
    await act(() => push(2));
    expect(result.current).toEqual({ value: 2, done: false });
    await act(() => push(3));
    expect(result.current).toEqual({ value: 3, done: false });
    await act(() => push(4));
    expect(result.current).toEqual({ value: 4, done: false });
    // we have to return stop here to stop act from yelling at us
    await act(async () => (stop(), stop));
    expect(result.current).toEqual({ value: -1, done: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("unmount", async () => {
    let push: (value: number) => Promise<void>;
    const repeater = new Repeater(async (push1) => {
      push = push1;
      return -1;
    });

    const callback = jest.fn(() => {
      return repeater;
    });
    const returnSpy = jest.spyOn(repeater, "return");
    const { result, unmount } = renderHook(() => {
      return useResult(callback);
    });

    expect(result.current).toBeUndefined();
    await act(() => push(1));
    expect(result.current).toEqual({ value: 1, done: false });
    unmount();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(returnSpy).toHaveBeenCalledTimes(1);
  });

  test("deps", async () => {
    const callback = jest.fn((deps) => {
      return new Repeater<number>(async (push1) => {
        const push = async (num: number) => {
          return act(() => push1(num));
        };

        for await (const [num] of deps) {
          await push(num);
        }

        return -1;
      });
    });

    const { result, rerender, waitForNextUpdate } = renderHook(
      (props) => {
        return useResult(callback, [props.num]);
      },
      { initialProps: { num: 1 } },
    );

    expect(result.current).toBeUndefined();
    await waitForNextUpdate();
    expect(result.current).toEqual({ value: 1, done: false });
    rerender({ num: 2 });
    expect(result.current).toEqual({ value: 1, done: false });
    await waitForNextUpdate();
    expect(result.current).toEqual({ value: 2, done: false });
    rerender({ num: 3 });
    expect(result.current).toEqual({ value: 2, done: false });
    await waitForNextUpdate();
    expect(result.current).toEqual({ value: 3, done: false });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("useValue", () => {
  test("basic", async () => {
    let push: (value: number) => Promise<void>;
    let stop: (() => void) & Promise<void>;
    const repeater = new Repeater(async (push1, stop1) => {
      push = push1;
      stop = stop1;
      return -1;
    });

    const callback = jest.fn(() => {
      return repeater;
    });

    const { result, rerender } = renderHook(() => {
      return useValue(callback);
    });

    expect(result.current).toBeUndefined();
    await act(() => push(1));
    expect(result.current).toBe(1);
    await act(() => push(2));
    expect(result.current).toBe(2);
    await act(() => push(3));
    expect(result.current).toBe(3);
    await act(() => push(4));
    expect(result.current).toBe(4);
    // we have to return stop here to stop act from yelling at us
    await act(async () => (stop(), stop));
    expect(result.current).toBe(-1);
    rerender();
    expect(result.current).toBe(-1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("unmount", async () => {
    let push: (value: number) => Promise<void>;
    const repeater = new Repeater(async (push1) => {
      push = push1;
      return -1;
    });

    const callback = jest.fn(() => {
      return repeater;
    });

    const returnSpy = jest.spyOn(repeater, "return");
    const { result, unmount } = renderHook(() => {
      return useValue(callback);
    });

    expect(result.current).toBeUndefined();
    await act(() => push(1));
    expect(result.current).toBe(1);
    unmount();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(returnSpy).toHaveBeenCalledTimes(1);
  });

  test("deps", async () => {
    const callback = jest.fn((deps) => {
      return new Repeater<number>(async (push1) => {
        const push = async (num: number) => {
          return act(() => push1(num));
        };

        for await (const [num] of deps) {
          await push(num);
        }

        return -1;
      });
    });

    const { result, rerender, waitForNextUpdate } = renderHook(
      (props) => {
        return useValue(callback, [props.num]);
      },
      { initialProps: { num: 1 } },
    );

    expect(result.current).toBeUndefined();
    await waitForNextUpdate();
    expect(result.current).toBe(1);
    rerender({ num: 2 });
    expect(result.current).toBe(1);
    await waitForNextUpdate();
    expect(result.current).toBe(2);
    rerender({ num: 3 });
    expect(result.current).toBe(2);
    await waitForNextUpdate();
    expect(result.current).toBe(3);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
