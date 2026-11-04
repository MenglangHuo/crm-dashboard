import { env } from "@/lib/config/env";

let cachedDispatcher: any = undefined;

if (env.allowInsecureTls) {
	if (typeof process !== "undefined") {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { Agent, setGlobalDispatcher } = require("undici");
		cachedDispatcher = new Agent({
			connect: {
				rejectUnauthorized: false,
			},
		});
		setGlobalDispatcher(cachedDispatcher);
	} catch {
		// Ignore if undici is not directly requireable
	}
}

export function getInsecureDispatcher(): any {
	return cachedDispatcher;
}

export function getFetchOptions(
	baseOptions: RequestInit = {},
): RequestInit & { dispatcher?: any } {
	const dispatcher = getInsecureDispatcher();
	if (dispatcher) {
		return {
			...baseOptions,
			dispatcher,
		};
	}
	return baseOptions;
}
