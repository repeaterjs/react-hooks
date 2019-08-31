import { useEffect, useState } from "react";
import { Push, Repeater, RepeaterBuffer, Stop } from "@repeaterjs/repeater";

// Repeaters are lazy, hooks are eager.
// We need to return push and stop synchronously from the useRepeater hook so
// we prime the repeater by calling next immediately.
function createPrimedRepeater<T>(
  buffer?: RepeaterBuffer<T>,
): [Repeater<T>, Push<T>, Stop] {
  let push: Push<T>;
  let stop: Stop;
  const repeater = new Repeater((push1, stop1) => {
    push = push1;
    stop = stop1;
    // this value is thrown away
    push(null as any);
  }, buffer);
  // pull and throw away the first value so the executor above runs
  repeater.next();
  return [repeater, push!, stop!];
}

export function useRepeater<T>(
  buffer?: RepeaterBuffer<T>,
): [Repeater<T>, Push<T>, Stop] {
	const [tuple] = useState(() => createPrimedRepeater(buffer));
	return tuple;
}

export function useAsyncIter<T, TDeps extends any[]>(
  callback: (deps: AsyncIterableIterator<TDeps>) => AsyncIterableIterator<T>,
  deps: TDeps = ([] as unknown) as TDeps,
): AsyncIterableIterator<T> {
  const [repeater, push] = useRepeater<TDeps>();
  const [iter] = useState(() => callback(repeater));
  useEffect(() => {
    push(deps);
  }, [push, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (iter.return != null) {
        // TODO: handle return errors
        iter.return().catch();
      }
    },
    [iter],
  );

  return iter;
}

export function useResult<T, TDeps extends any[]>(
  callback: (deps: AsyncIterableIterator<TDeps>) => AsyncIterableIterator<T>,
  deps?: TDeps,
): IteratorResult<T> | undefined {
  const iter = useAsyncIter(callback, deps);
  const [result, setResult] = useState<IteratorResult<T>>();
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        while (mounted) {
          const result = await iter.next();
          if (mounted) {
            setResult(result);
          }

          if (result.done) {
            break;
          }
        }
      } catch (err) {
        if (mounted) {
          setResult(() => {
            throw err;
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [iter]);

  return result;
}
