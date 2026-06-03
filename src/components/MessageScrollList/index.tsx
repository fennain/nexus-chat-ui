import { MessageList } from "@chatscope/chat-ui-kit-react";
import { Divider } from "@douyinfe/semi-ui";
import { useCallback, useEffect, useRef, type UIEvent } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { DEFAULT_AVATAR } from "@/constants";
import { useDayJs } from "@/hooks/useDayJs";
import { useScroll } from "@/hooks/useScroll";
import { isSameUserId, toUserIdKey } from "@/lib/chatUser";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import type {
  ChatChannelMemberDetail,
  ChatMessageItem,
  ChatUserId,
} from "@/types";

interface MessageScrollListProps {
  isChannel?: boolean;
  isLoading?: boolean;
  messages: ChatMessageItem[];
  channelMembersDetail?: ChatChannelMemberDetail[];
  currentUserId?: ChatUserId;
  onScrollTop?: (scrollContainer: HTMLDivElement) => void;
}

export function MessageScrollList({
  isChannel = false,
  isLoading = false,
  messages,
  channelMembersDetail = [],
  currentUserId,
  onScrollTop,
}: MessageScrollListProps) {
  const usersById = useChatUsersStore((state) => state.usersById);
  const contactList = useChatUsersStore((state) => state.contactList);
  const { formatDateTime } = useDayJs();
  const messageListRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRef = useRef(false);
  const { scrollToBottom } = useScroll({
    containerRef: messageListRef,
  });

  const handleMessageListScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scrollContainer = event.currentTarget;

      if (scrollContainer.scrollTop <= 24) {
        onScrollTop?.(scrollContainer);
      }
    },
    [onScrollTop],
  );

  useEffect(() => {
    if (!messages.length) {
      hasInitialScrollRef.current = false;
      return;
    }

    if (!hasInitialScrollRef.current) {
      hasInitialScrollRef.current = true;
      void scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  return (
    <MessageList loading={isLoading}>
      <MessageList.Content className="h-full">
        <div
          id="scrollRef"
          ref={messageListRef}
          className="h-full overflow-hidden overflow-y-auto"
          onScroll={handleMessageListScroll}
        >
          {messages.map((item) => {
            const senderId = item.senderId;
            const senderIdKey = toUserIdKey(senderId);
            const isCurrentUserMessage = isSameUserId(
              item.senderId,
              currentUserId,
            );
            const matchedContact =
              senderIdKey && !isCurrentUserMessage
                ? contactList.find((contact) =>
                    isSameUserId(contact.targetUserId, senderId),
                  )
                : undefined;
            const senderName =
              matchedContact?.alias?.trim() ||
              usersById[senderIdKey]?.userName ||
              senderIdKey ||
              "Unknown";
            const senderAvatar = usersById[senderIdKey]?.avatarUrl ?? "Unknown";
            const senderRole = channelMembersDetail.find((member) =>
              isSameUserId(member.userId, senderId),
            )?.role;

            return (
              <div key={item._id}>
                {item.type === "SYSTEAM" ? (
                  <Divider margin="12px" align="center">
                    {item.encryption?.text ?? "Operation failed"}
                  </Divider>
                ) : (
                  <ChatMessage
                    id={item._id}
                    channelId={isChannel ? item.roomId : undefined}
                    userId={senderId}
                    avatar={
                      senderAvatar !== "Unknown" ? senderAvatar : DEFAULT_AVATAR
                    }
                    content={item.encryption?.text ?? ""}
                    datetime={formatDateTime(item.sentAt)}
                    isCurrentUserMessage={isCurrentUserMessage}
                    role={isChannel ? senderRole : undefined}
                    senderName={senderName}
                    status={item.status}
                  />
                )}
              </div>
            );
          })}
        </div>
      </MessageList.Content>
    </MessageList>
  );
}

export default MessageScrollList;
