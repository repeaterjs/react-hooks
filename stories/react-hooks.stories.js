import React from "react"; // eslint-disable-line
import { useCallback, useState } from "react";
import { storiesOf } from "@storybook/react";
import { Repeater } from "@repeaterjs/repeater";
import { useResult } from "../lib/react-hooks.esm";

storiesOf("useResult", module)
	.add("counter", () => {
		const result = useResult(async function*() {
			let i = 0;
			while (true) {
				yield i++;
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		});

		return (
			<div>Current value: {result && result.value}</div>
		);
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
				{result && result.value.map((message, i) => (
					<div key={i}>{message}</div>
				))}
			</div>
		);
	});
