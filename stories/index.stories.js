import React from "react"; // eslint-disable-line
import { storiesOf } from "@storybook/react";
import { useResult } from "../lib/react-hooks.esm";

storiesOf("@repeaterjs/react-hooks", module)
  .add("incrementing counter", () => {
    const result = useResult(async function*() {
      let i = 0;
      while (true) {
        yield i++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });

    if (result == null) {
      return null;
    }

    return <div>Current value: {result.value}</div>;
  })
  .add("with some emoji", () => {
    return <div>Yo world</div>;
  });
