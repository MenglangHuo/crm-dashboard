"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	attachmentsApi,
	uploadFileWithAttachment,
	type AttachmentListParams,
} from "@/lib/api/endpoints";
import type { CreateAttachmentInput, UpdateAttachmentInput } from "@/lib/types";

export const ATTACHMENTS_QUERY_KEY = ["attachments"];

export function useAttachments(
	params: AttachmentListParams = {},
	enabled = true,
) {
	return useQuery({
		queryKey: [...ATTACHMENTS_QUERY_KEY, params],
		queryFn: () => attachmentsApi.list(params),
		staleTime: 30 * 1000,
		enabled: enabled,
	});
}

export function useAttachment(id: string | number | null | undefined) {
	return useQuery({
		queryKey: [...ATTACHMENTS_QUERY_KEY, "detail", id],
		queryFn: () => (id ? attachmentsApi.get(id) : null),
		enabled: Boolean(id),
	});
}

export function useAttachmentDownloadUrl(
	id: string | number | null | undefined,
	enabled = false,
) {
	return useQuery({
		queryKey: [...ATTACHMENTS_QUERY_KEY, "download-url", id],
		queryFn: () => (id ? attachmentsApi.getDownloadUrl(id) : null),
		enabled: Boolean(id && enabled),
		staleTime: 5 * 60 * 1000, // presigned URLs are valid for 15 mins typically
	});
}

export function useCreateAttachment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateAttachmentInput) => attachmentsApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ATTACHMENTS_QUERY_KEY });
		},
	});
}

export function useUploadAttachment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			file,
			options,
		}: {
			file: File;
			options?: {
				category?: string;
				description?: string;
				branchId?: number | string;
				isPublic?: boolean;
				onProgress?: (percent: number) => void;
			};
		}) => uploadFileWithAttachment(file, options),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ATTACHMENTS_QUERY_KEY });
		},
	});
}

export function useUpdateAttachment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string | number;
			data: UpdateAttachmentInput;
		}) => attachmentsApi.update(id, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ATTACHMENTS_QUERY_KEY });
			queryClient.invalidateQueries({
				queryKey: [...ATTACHMENTS_QUERY_KEY, "detail", variables.id],
			});
		},
	});
}

export function useDeleteAttachment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string | number) => attachmentsApi.remove(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ATTACHMENTS_QUERY_KEY });
		},
	});
}
