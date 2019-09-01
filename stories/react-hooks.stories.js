import React from "react"; // eslint-disable-line
import { useState } from "react";
import { storiesOf } from "@storybook/react";
import { Repeater } from "@repeaterjs/repeater";
import { useAsyncIter, useResult } from "../lib/react-hooks.esm";

storiesOf("useResult", module)
  .add("counter", () => {
    const result = useResult(async function*() {
      let i = 0;
      while (true) {
        yield i++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });

    return <div>Current value: {result && result.value}</div>;
  })
  .add("websocket", () => {
    const [socket] = useState(() => {
      return new WebSocket("wss://echo.websocket.org");
    });
    const [open] = useState(() => {
      return new Promise((resolve) => (socket.onopen = resolve));
    });
    const messages = new Repeater(async (push, stop) => {
      socket.onmessage = (ev) => push(ev.data);
      socket.onerror = () => stop(new Error("WebSocket error"));
      socket.onclose = () => stop();
      await stop;
      socket.close();
    });
    const [value, setValue] = useState("");
    const result = useResult(async function*() {
      const value = [];
      yield value;
      for await (const message of messages) {
        value.push(message);
        yield value;
      }
    });
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(ev) => {
            setValue(ev.target.value);
          }}
          onKeyPress={(ev) => {
            if (ev.key === "Enter") {
              open.then(() => {
                socket.send(value);
                setValue("");
              });
            }
          }}
        />
        {result &&
          result.value.map((message, i) => <div key={i}>{message}</div>)}
      </div>
    );
  })
  .add("konami", () => {
    const konami = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    const keys = useAsyncIter(() => {
      return new Repeater(async (push, stop) => {
        const listener = (ev) => {
          push(ev.key);
        };
        window.addEventListener("keyup", listener);
        await stop;
        window.removeEventListener("keyup", listener);
      });
    });

    const result = useResult(async function*() {
      let i = 0;
      yield konami[i];
      for await (const key of keys) {
        if (key === konami[i]) {
          yield `${konami[i]} (pressed)`;
          i++;
        } else {
          i = 0;
        }

        if (i < konami.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          yield konami[i];
        } else {
          return "Cheats activated";
        }
      }
    });

    if (result == null) {
      return null;
    } else if (result.done) {
      return <div>🎉 {result.value} 🎉</div>;
    }

    return <div>Next key: {result.value}</div>;
  });
