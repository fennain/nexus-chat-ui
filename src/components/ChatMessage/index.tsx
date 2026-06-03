import { Tag, Typography } from "@douyinfe/semi-ui";
import type { ReactNode } from "react";
import { ChannelAvatar } from "@/components/ChannelAvatar";
import { CHANNEL_TAG_COLOR } from "@/constants";
import { cn } from "@/lib/utils";
import type { ChannelRole, ChatUserId } from "@/types";

interface ChatMessageProps {
  id?: string;
  channelId?: string;
  userId?: ChatUserId;
  avatar?: string;
  content?: ReactNode;
  datetime?: string;
  isCurrentUserMessage?: boolean;
  role?: ChannelRole;
  senderName: ReactNode;
  status?: string;
}

export function ChatMessage({
  id,
  channelId,
  userId,
  avatar,
  content,
  datetime,
  isCurrentUserMessage = false,
  role,
  senderName,
  status,
}: ChatMessageProps) {
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

        <Typography.Text
          className={cn(
            "block! max-w-full whitespace-pre-wrap break-words rounded-[8px] px-[16px] py-[12px] text-[14px] leading-[22px]",
            isCurrentUserMessage
              ? "bg-slate-100 text-slate-700"
              : "border border-slate-200 bg-white text-slate-700",
            status === "error" ? "text-red-600!" : "",
          )}
        >
          {content}
        </Typography.Text>
      </div>
    </div>
  );
}

export default ChatMessage;
