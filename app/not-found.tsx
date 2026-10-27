import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = {
	title: "404 - Page Not Found | CRM Admin Dashboard",
	description: "The page you are looking for might have been moved, deleted, or does not exist.",
};

export default function NotFound() {
	return <NotFoundContent />;
}
