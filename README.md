# @repeaterjs/react-hooks
React hooks for working with async iterators/generators, built with repeaters.

For more information about repeaters, visit [repeater.js.org](https://repeater.js.org).

## API
### `useResult`

```ts
declare function useResult<T, TDeps extends any[]>(
  callback: (deps: AsyncIterableIterator<TDeps>) => AsyncIterableIterator<T>,
  deps?: TDeps,
): IteratorResult<T> | undefined;

import { useResult } from "@repeaterjs/react-hooks";

const result = useResult(async function*() {
  /* async generator body */
});
```

`callback` is a function which returns an async iterator, usually an async
generator function. The callback will be called as the component is constructed
and the returned iterator will update the component as each result resolves.
Returns an `IteratorResult<T>`, i.e. `{ value: T, done: boolean }`, where `T`
is the type of the emitted values, and `done` signifies whether the iterator
has returned. The first return value from this hook will be `undefined`,
signifying that the iterator has yet to emit any values.

Example:
```js
function Timer() {
  const result = useResult(async function*() {
    let i = 0;
    while (true) {
      yield i++
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  return (
    <div>Seconds: {result && result.value}</div>
  );
}
```

Similar to React’s `useEffect`, `useResult` accepts an array of dependencies as
a second argument. However, rather than being referenced via closure, the
dependencies are passed into the callback as an async iterator which updates
whenever any of the dependencies change. We pass the dependencies in manually
because `callback` is only called once, and dependencies referenced via closure
become stale as the component updates.

```js
function ProductDetail({productId}) {
  const result = useResult(async function*(deps) {
    for await (const [productId] of deps) {
			const data = await fetchProductData(productId);
			yield data.description;
    }
  }, [productId]);

	if (result == null) {
		return <div>Loading...</div>;
	}

  return (
    <div>Description: {result.value}</div>
  );
}
```

TODO: come up with a better example.

### `useAsyncIter`

```ts
declare function useAsyncIter<T, TDeps extends any[]>(
  callback: (deps: AsyncIterableIterator<TDeps>) => AsyncIterableIterator<T>,
  deps: TDeps = ([] as unknown) as TDeps,
): AsyncIterableIterator<T>;

import { useAsyncIter } from "@repeaterjs/react-hooks";
```

Similar to `useResult`, except that `useAsyncIter` returns the async iterator
rather than consuming it. The returned async iterator can be referenced via
closure in later `useResult` calls.

TODO: Example

### `useRepeater`

```ts
declare function useRepeater<T>(
  buffer?: RepeaterBuffer<T>,
): [Repeater<T>, Push<T>, Stop];

import { useRepeater } from "@repeaterjs/react-hooks";
```

Creates a repeater which can be used in useResult callbacks. `push` and `stop`
can be passed to children to update the repeater. For more information about
the `push` and `stop` functions or the buffer argument, refer to the
[repeater.js docs](https://repeater.js.org/docs/overview).

Example:

```js
function MarkdownEditor() {
  const [inputs, pushInput] = useRepeater();
  const result = useResult(async function*() {
    const md = new Remarkable();
    for await (const input of inputs) {
      yield md.render(input);
    }
  });
  return (
    <div>
      <h3>Input</h3>
      <textarea
        defaultValue="Hello, **world**!"
        onChange={(ev) => push(ev.target.value)}
      />
      <h3>Output</h3>
      <div dangerouslySetInnnerHTML={{ __html: result && result.value }} />
    </div>
  );
}
```

See also:
- [React coroutine](https://github.com/alexeyraspopov/react-coroutine)
