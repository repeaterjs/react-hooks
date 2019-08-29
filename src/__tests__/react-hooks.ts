import { Repeater } from "@repeaterjs/repeater";
import { act, renderHook } from "@testing-library/react-hooks";
import { useAsyncIter, useRepeater, useResult } from "../react-hooks";

describe("useAsyncIter", () => {
  test("render", async () => {
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

    unmount();
    expect(await result.current.next()).toEqual({ done: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("useResult", () => {
  test("render", async () => {
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
    await act(() => push(2));
    expect(result.current).toEqual({ value: 2, done: false });
    await act(() => push(3));
    expect(result.current).toEqual({ value: 3, done: false });
    unmount();
    expect(result.current).toEqual({ value: 3, done: false });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(returnSpy).toHaveBeenCalledTimes(1);
  });
});

describe("useRepeater", () => {
  test("render", async () => {
    const { result } = renderHook(() => {
      return useRepeater();
    });

    const [repeater, push, stop] = result.current;
    expect(repeater).toBeDefined();
    expect(push).toBeDefined();
    expect(stop).toBeDefined();
    push(1);
    push(2);
    push(3);
    push(4);
    stop();
    expect(await repeater.next()).toEqual({ value: 1, done: false });
    expect(await repeater.next()).toEqual({ value: 2, done: false });
    expect(await repeater.next()).toEqual({ value: 3, done: false });
    expect(await repeater.next()).toEqual({ value: 4, done: false });
    expect(await repeater.next()).toEqual({ done: true });
  });
});
