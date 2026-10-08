import React from "react";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 text-slate-950">
			{children}
		</div>
	);
}
