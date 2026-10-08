import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"h-9 w-full min-w-0 rounded-lg border border-input bg-background/60 px-3 py-1.5 text-sm transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:focus-visible:border-primary dark:focus-visible:ring-primary/30 dark:aria-invalid:border-destructive/50",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
