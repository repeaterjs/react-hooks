import { useEffect, useState } from "react";
import { Push, Repeater, RepeaterBuffer, Stop } from "@repeaterjs/repeater";

export function useAsyncIter<T>(
  callback: () => AsyncIterableIterator<T>,
): AsyncIterableIterator<T> {
  const [iter] = useState(() => callback());
  useEffect(
    () => () => {
      if (iter.return != null) {
        // TODO: handle return errors
        iter.return().catch();
      }
    },
    [],
  );

  return iter;
}

export function useResult<T>(
  callback: () => AsyncIterableIterator<T>,
): IteratorResult<T> | undefined {
  const iter = useAsyncIter(callback);
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

export function useRepeater<T>(
  buffer?: RepeaterBuffer<T>,
): [Repeater<T>, Push<T>, Stop] {
  let push: Push<T>;
  let stop: Stop;
  const [repeater] = useState(() => {
    const repeater = new Repeater((push1, stop1) => {
      push = push1;
      stop = stop1;
    }, buffer);

    // We pull the first value so that the executor runs.
    repeater.next();
    // The first value (null) is thrown away.
    push(null as any);
    return repeater;
  });

  return [repeater, push!, stop!];
}
