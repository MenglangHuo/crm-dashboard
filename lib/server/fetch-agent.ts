import { env } from "@/lib/config/env";

let cachedDispatcher: any = undefined;

if (env.allowInsecureTls) {
	if (typeof process !== "undefined") {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	}
	try {
		// Use dynamic require so bundlers without undici installed during build won't fail
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const undici = require("undici");
		if (undici && undici.Agent && undici.setGlobalDispatcher) {
			cachedDispatcher = new undici.Agent({
				connect: {
					rejectUnauthorized: false,
				},
			});
			undici.setGlobalDispatcher(cachedDispatcher);
		}
	} catch {
		// Ignore if undici is not directly requireable in the runtime environment
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
