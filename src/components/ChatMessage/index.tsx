import { Tag } from "@douyinfe/semi-ui";
import type { ReactNode } from "react";
import { ChannelAvatar } from "@/components/ChannelAvatar";
import { CHANNEL_TAG_COLOR } from "@/constants";
import { cn } from "@/lib/utils";
import type { ChannelRole, ChatAttachmentItem, ChatUserId } from "@/types";

interface ChatMessageProps {
  id?: string;
  channelId?: string;
  userId?: ChatUserId;
  avatar?: string;
  attachment?: ChatAttachmentItem;
  content?: ReactNode;
  datetime?: string;
  isCurrentUserMessage?: boolean;
  role?: ChannelRole;
  senderName: ReactNode;
  status?: string;
}

const formatFileSize = (size?: number) => {
  if (!size || size <= 0) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let nextSize = size;
  let unitIndex = 0;

  while (nextSize >= 1024 && unitIndex < units.length - 1) {
    nextSize /= 1024;
    unitIndex += 1;
  }

  return `${nextSize.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDuration = (duration?: number) => {
  if (!duration || duration <= 0) {
    return undefined;
  }

  const totalSeconds = Math.round(duration);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

function AttachmentContent({ attachment }: { attachment: ChatAttachmentItem }) {
  if (attachment.kind === "IMAGE") {
    return (
      <a
        className="block max-w-[280px] overflow-hidden rounded-[8px]"
        href={attachment.url}
        rel="noreferrer"
        target="_blank"
      >
        <img
          alt={attachment.name}
          className="block max-h-[260px] max-w-full object-contain"
          src={attachment.thumbnailUrl || attachment.url}
        />
        <span className="block truncate bg-slate-50 px-[10px] py-[8px] text-[12px] text-slate-500">
          {attachment.name}
        </span>
      </a>
    );
  }

  if (attachment.kind === "AUDIO") {
    return (
      <div className="flex min-w-[220px] max-w-[320px] flex-col gap-[8px]">
        <div className="flex items-center justify-between gap-[12px] text-[13px] text-slate-600">
          <span>Voice message</span>
          {formatDuration(attachment.duration) ? (
            <span>{formatDuration(attachment.duration)}</span>
          ) : null}
        </div>
        <audio className="h-[36px] w-full" controls src={attachment.url} />
      </div>
    );
  }

  return (
    <a
      className="flex min-w-[220px] max-w-[320px] flex-col gap-[4px] text-slate-700 no-underline"
      download={attachment.name}
      href={attachment.url}
      rel="noreferrer"
      target="_blank"
    >
      <span className="truncate text-[14px] font-medium">{attachment.name}</span>
      <span className="text-[12px] text-slate-500">
        {formatFileSize(attachment.size)}
      </span>
    </a>
  );
}

export function ChatMessage({
  id,
  channelId,
  userId,
  avatar,
  attachment,
  content,
  datetime,
  isCurrentUserMessage = false,
  role,
  senderName,
  status,
}: ChatMessageProps) {
  const messageContent = attachment ? (
    <AttachmentContent attachment={attachment} />
  ) : (
    content
  );

  return (
    <div
      data-message-id={id}
      className={cn(
        "flex w-full items-start gap-[12px] px-[8px] py-[12px]",
        isCurrentUserMessage ? "flex-row-reverse" : undefined,
      )}
    >
      <ChannelAvatar
        channelId={channelId}
        userId={userId}
        avatar={avatar}
        name={typeof senderName === "string" ? senderName : undefined}
        role={role}
        size="small"
      />

      <div
        className={cn(
          "flex max-w-[72%] flex-col gap-[6px]",
          isCurrentUserMessage ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-[6px] text-[13px] leading-[20px] text-slate-400",
            isCurrentUserMessage ? "flex-row-reverse justify-start" : "justify-start",
          )}
        >
          <span>{senderName}</span>
          {role ? (
            <Tag
              size="small"
              shape="circle"
              color={CHANNEL_TAG_COLOR[role]}
            >
              {role}
            </Tag>
          ) : null}
          {datetime ? <span className="text-[10px]">{datetime}</span> : null}
        </div>

        <div
          className={cn(
            "block! max-w-full whitespace-pre-wrap break-words rounded-[8px] px-[16px] py-[12px] text-[14px] leading-[22px]",
            isCurrentUserMessage
              ? "bg-slate-100 text-slate-700"
              : "border border-slate-200 bg-white text-slate-700",
            status === "error" ? "text-red-600!" : "",
          )}
        >
          {messageContent}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
