import {
  Avatar,
  ConversationHeader,
  EllipsisButton,
} from "@chatscope/chat-ui-kit-react";
import { Button } from "@douyinfe/semi-ui";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChannelDetailSideSheet } from "@/components/ChannelDetailSideSheet";
import { MessageInput } from "@/components/MessageInput";
import { MessageScrollList } from "@/components/MessageScrollList";
import { useBasicLayout } from "@/hooks/useBasicLayout";
import type {
  ChatChannelMemberDetail,
  ChatConnectionStatus,
  ChatMessageItem,
  ChatUserId,
} from "@/types";
import Group from "@/assets/Group.png";
import { useChatSessionsStore } from "@/store/useChatSessionsStore";

interface NexusChatPanelProps {
  hasActiveConversation: boolean;
  connectionStatus: ChatConnectionStatus;
  hasReconnectExhausted: boolean;
  isMessagesLoading: boolean;
  messages: ChatMessageItem[];
  inputValue: string;
  placeholder: string;
  resolvedDisabled: boolean;
  headerName: string;
  headerAvatar?: string;
  headerInfo?: string;
  isChannel?: boolean;
  channelId?: string;
  channelDescription?: string;
  channelCreatedBy?: ChatUserId;
  channelMemberIds?: ChatUserId[];
  channelMembersDetail?: ChatChannelMemberDetail[];
  currentUserId?: ChatUserId;
  onAddMemberClick?: () => void;
  onBackClick?: () => void;
  onReconnect?: () => void;
  onScrollTop?: (scrollContainer: HTMLDivElement) => void;
  className?: string;
  style?: CSSProperties;
  onChange: (innerHtml: string, textContent: string, innerText: string) => void;
  onSend: (innerHtml: string, textContent: string, innerText: string) => void;
}

export function ChatPanel({
  hasActiveConversation,
  connectionStatus,
  hasReconnectExhausted,
  isMessagesLoading,
  messages,
  inputValue,
  placeholder,
  resolvedDisabled,
  headerName,
  headerAvatar,
  headerInfo,
  isChannel = false,
  channelId,
  channelDescription,
  channelCreatedBy,
  channelMembersDetail = [],
  currentUserId,
  onAddMemberClick,
  onBackClick,
  onReconnect,
  onScrollTop,
  className,
  style,
  onChange,
  onSend,
}: NexusChatPanelProps) {
  const { isMobile } = useBasicLayout();
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const activeConversationId = useChatSessionsStore(
    (state) => state.activeConversationId,
  );
  const [isChannelDetailOpen, setIsChannelDetailOpen] = useState(false);

  const connectionStatusTextMap: Record<ChatConnectionStatus, string> = {
    idle: "Waiting to establish connection",
    connecting: "Connecting",
    connected: "Connected",
    disconnected: "Disconnected. Trying to reconnect",
    error: "Connection failed",
  };

  // 关闭群聊详情弹窗
  // 当 activeConversationId 变化时，关闭群聊详情弹窗
  useEffect(() => {
    setIsChannelDetailOpen(false);
  }, [activeConversationId]);

  if (!hasActiveConversation) {
    const showConnectionStatus = connectionStatus !== "connected";

    return (
      <div
        className={`flex h-full flex-1 items-center justify-center px-[24px] text-center text-[14px] text-slate-500 ${className ?? ""}`.trim()}
        style={style}
      >
        <div className="flex flex-col items-center gap-[12px]">
          <div>
            {showConnectionStatus
              ? connectionStatusTextMap[connectionStatus]
              : "Select a user to start a conversation"}
          </div>
          {hasReconnectExhausted ? (
            <Button onClick={onReconnect} theme="solid" type="primary">
              Reconnect
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chatPanelRef}
      className={[
        "order-1 overflow-hidden z-[1] flex h-full min-w-[180px] flex-1 basis-[65%] flex-col border-l border-solid border-l-[#d1dbe3] bg-white text-[rgba(0,0,0,0.87)] box-border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <ConversationHeader>
        <ConversationHeader.Back hidden={!isMobile} onClick={onBackClick} />
        <Avatar name={headerName} src={isChannel ? Group : headerAvatar} />
        <ConversationHeader.Content info={headerInfo} userName={headerName} />
        <ConversationHeader.Actions>
          {isChannel ? (
            <EllipsisButton onClick={() => setIsChannelDetailOpen(true)} />
          ) : null}
          {/* {isChannel ? (
            <AvatarGroup max={3}>
              {channelMemberIds.map((memberId) => {
                const member = usersById[toUserIdKey(memberId)];
                const memberName =
                  member?.userName ?? String(memberId ?? "Unknown");
                const memberAvatar = member?.avatarUrl;

                return (
                  <Avatar
                    key={toUserIdKey(memberId)}
                    name={memberName}
                    src={memberAvatar ?? DEFAULT_AVATAR}
                  />
                );
              })}
            </AvatarGroup>
          ) : null} */}
        </ConversationHeader.Actions>
      </ConversationHeader>

      <MessageScrollList
        channelMembersDetail={channelMembersDetail}
        currentUserId={currentUserId}
        isChannel={isChannel}
        isLoading={isMessagesLoading}
        messages={messages}
        onScrollTop={onScrollTop}
      />

      <MessageInput
        value={inputValue}
        placeholder={placeholder}
        disabled={resolvedDisabled}
        sendDisabled={resolvedDisabled}
        onChange={onChange}
        onSend={onSend}
      />

      {isChannel ? (
        <ChannelDetailSideSheet
          open={isChannelDetailOpen}
          channelId={channelId}
          name={headerName}
          description={channelDescription}
          createdBy={channelCreatedBy}
          currentUserId={currentUserId}
          membersDetail={channelMembersDetail}
          isMobile={isMobile}
          getPopupContainer={() => chatPanelRef.current ?? document.body}
          onCancel={() => setIsChannelDetailOpen(false)}
          onAddMemberClick={onAddMemberClick}
        />
      ) : null}
    </div>
  );
}
