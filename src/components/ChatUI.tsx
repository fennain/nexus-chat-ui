import {
  type ReactNode,
  useRef,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MainContainer } from "@chatscope/chat-ui-kit-react";
import { Button, Spin } from "@douyinfe/semi-ui";
import { ChatPanel } from "@/components/ChatPanel";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import CommonModal from "@/components/Modal";
import {
  ModalContextProvider,
  useModalContextSelector,
} from "@/context/modal-context";
import { useBasicLayout } from "@/hooks/useBasicLayout";
import { useNexusChat } from "@/hooks/useNexusChat";
import { getConversationDisplayProfile } from "@/lib/chatConversation";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import type { NexusChatUIProps } from "@/types";
import { useChatSessionsStore } from "@/store/useChatSessionsStore";
import { DEFAULT_AVATAR } from "@/constants";

export function NexusChatUI(props: NexusChatUIProps) {
  if (!props.token?.trim()) {
    return null;
  }

  return (
    <ModalContextProvider>
      <NexusChatUIContent {...props} />
    </ModalContextProvider>
  );
}

function NexusChatUIContent({
  placeholder = "Type message here",
  className,
  disabled = false,
  ...chatOptions
}: NexusChatUIProps) {
  const wrapperClassName = ["flex w-full flex-col h-full", className]
    .filter(Boolean)
    .join(" ");
  const containerStyle: CSSProperties = { height: "100%" };
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarStyle, setSidebarStyle] = useState<CSSProperties>({});
  const [chatContainerStyle, setChatContainerStyle] = useState<CSSProperties>(
    {},
  );
  const [conversationContentStyle, setConversationContentStyle] =
    useState<CSSProperties>({});
  const [conversationAvatarStyle, setConversationAvatarStyle] =
    useState<CSSProperties>({});
  const [isReconnectConfirmOpen, setIsReconnectConfirmOpen] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useBasicLayout();
  const setContactSelect = useModalContextSelector(
    (state) => state.setContactSelect,
  );
  const {
    activeConversationId,
    connectionStatus,
    conversations,
    handleChange,
    handleLoadPreviousMessages,
    handleReconnect,
    handleSend,
    hasReconnectExhausted,
    inputValue,
    isMessagesLoading,
    messages,
    resolvedDisabled,
  } = useNexusChat({
    ...chatOptions,
    disabled,
  });
  const currentUser = useChatUsersStore((state) => state.currentUser);
  const allUserList = useChatUsersStore((state) => state.allUserList);
  const contactList = useChatUsersStore((state) => state.contactList);
  const channels = useChatSessionsStore((state) => state.channels);
  const setStoreActiveConversationId = useChatSessionsStore(
    (state) => state.setActiveConversationId,
  );

  const activeConversation = useMemo(
    () =>
      [...conversations, ...channels].find(
        (conversation) => conversation._id === activeConversationId,
      ),
    [activeConversationId, channels, conversations],
  );
  const activeChannel = useMemo(
    () =>
      activeConversation && "members" in activeConversation
        ? activeConversation
        : undefined,
    [activeConversation],
  );

  const activeConversationProfile = useMemo(() => {
    if (!activeConversation) {
      return undefined;
    }

    if ("name" in activeConversation) {
      return {
        avatarUrl: undefined,
        displayName: activeConversation.name || "Channel",
        info: undefined,
      };
    }

    return getConversationDisplayProfile({
      conversation: activeConversation,
      allUsers: allUserList,
      contacts: contactList,
      currentUserId: currentUser?.userId,
    });
  }, [activeConversation, allUserList, contactList, currentUser?.userId]);

  const connectionTip = useMemo(() => {
    if (hasReconnectExhausted) {
      return "Reconnect attempts are exhausted. Please reconnect manually.";
    }

    switch (connectionStatus) {
      case "idle":
        return "Waiting to establish connection";
      case "connecting":
        return "Connecting";
      case "disconnected":
        return "Disconnected. Trying to reconnect";
      case "error":
        return "Connection failed";
      default:
        return "";
    }
  }, [connectionStatus, hasReconnectExhausted]);

  const isReconnectButtonLoading =
    isReconnectConfirmOpen &&
    !hasReconnectExhausted &&
    connectionStatus !== "connected";

  const reconnectModalFooter = useMemo<ReactNode>(
    () => (
      <div className="flex justify-end gap-[12px]">
        <Button
          loading={isReconnectButtonLoading}
          theme="solid"
          type="primary"
          onClick={handleReconnect}
        >
          Reconnect
        </Button>
      </div>
    ),
    [handleReconnect, isReconnectButtonLoading],
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setStoreActiveConversationId(conversationId);

      if (sidebarVisible) {
        setSidebarVisible(false);
      }
    },
    [setStoreActiveConversationId, sidebarVisible],
  );

  const handleBackToList = useCallback(() => {
    setSidebarVisible((visible) => !visible);
    setStoreActiveConversationId(undefined);
  }, [setStoreActiveConversationId]);

  const handleOpenAddChannelMemberModal = useCallback(() => {
    if (activeChannel) {
      setContactSelect({
        channelId: activeChannel._id,
        channelName: activeChannel.name,
      });
    }
  }, [activeChannel, setContactSelect]);

  useEffect(() => {
    if (isMobile && !activeConversationId) {
      setSidebarVisible(true);
    }
  }, [activeConversationId, isMobile]);

  useEffect(() => {
    if (sidebarVisible) {
      setSidebarStyle({
        display: "flex",
        flexBasis: "auto",
        width: "100%",
        maxWidth: "100%",
      });
      setConversationContentStyle({
        display: "flex",
      });
      setConversationAvatarStyle({
        marginRight: "1em",
      });
      setChatContainerStyle({
        display: "none",
        // width: 0,
        // padding: 0,
        // visibility: "hidden",
        // overflow: "hidden",
      });
      return;
    }

    setSidebarStyle({});
    setConversationContentStyle({});
    setConversationAvatarStyle({});
    setChatContainerStyle({});
  }, [sidebarVisible]);

  useEffect(() => {
    if (hasReconnectExhausted) {
      setIsReconnectConfirmOpen(true);
    }
  }, [hasReconnectExhausted]);

  useEffect(() => {
    if (connectionStatus === "connected") {
      setIsReconnectConfirmOpen(false);
    }
  }, [connectionStatus]);

  return (
    <div className={wrapperClassName}>
      <div
        ref={modalContainerRef}
        className="relative h-full w-full overflow-hidden border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08),0_8px_20px_rgba(15,23,42,0.06)] [&_.cs-main-container]:border-0 [&_.cs-main-container]:bg-transparent [&_.cs-chat-container]:bg-[linear-gradient(180deg,_#f8fafc,_#ffffff_28%)] [&_.cs-message-input]:border-t [&_.cs-message-input]:border-slate-200 [&_.cs-message-input]:bg-white/95 [&_.cs-message-input__content-editor-wrapper]:bg-slate-50 [&_.cs-message-list]:bg-transparent"
        style={containerStyle}
      >
        <Spin
          tip={connectionTip}
          spinning={connectionStatus !== "connected"}
          wrapperClassName="h-full!"
          childStyle={{ height: "100%" }}
        >
          <MainContainer responsive className="text-[16px]! overflow-hidden!">
            <ConversationSidebar
              onSelectConversation={handleSelectConversation}
              style={sidebarStyle}
              conversationContentStyle={conversationContentStyle}
              conversationAvatarStyle={conversationAvatarStyle}
            />
            <ChatPanel
              hasActiveConversation={Boolean(activeConversationId)}
              connectionStatus={connectionStatus}
              hasReconnectExhausted={hasReconnectExhausted}
              isMessagesLoading={isMessagesLoading}
              messages={messages}
              inputValue={inputValue}
              placeholder={placeholder}
              resolvedDisabled={resolvedDisabled}
              headerAvatar={activeConversationProfile?.avatarUrl ?? DEFAULT_AVATAR}
              headerName={
                activeConversationProfile?.displayName ?? "Conversation"
              }
              headerInfo={activeConversationProfile?.info}
              isChannel={Boolean(activeChannel)}
              channelId={activeChannel?._id}
              channelDescription={activeChannel?.description}
              channelCreatedBy={activeChannel?.createdBy}
              channelMemberIds={activeChannel?.members ?? []}
              channelMembersDetail={activeChannel?.membersDetail ?? []}
              currentUserId={currentUser?.userId}
              onAddMemberClick={handleOpenAddChannelMemberModal}
              onBackClick={handleBackToList}
              onReconnect={handleReconnect}
              onScrollTop={handleLoadPreviousMessages}
              style={chatContainerStyle}
              onChange={handleChange}
              onSend={handleSend}
            />
          </MainContainer>
        </Spin>
        <CommonModal
          open={isReconnectConfirmOpen}
          title="Connection Disconnected"
          description="Automatic reconnect failed. Do you want to reconnect?"
          width={420}
          footer={reconnectModalFooter}
          maskClosable={false}
          closable={false}
          closeOnEsc={false}
          getPopupContainer={() => modalContainerRef.current ?? document.body}
          onCancel={() => {}}
        >
          <div className="text-[14px] leading-[24px] text-slate-600">
            Current connection status: {connectionTip || "Connection error"}
          </div>
        </CommonModal>
      </div>
    </div>
  );
}

export default NexusChatUI;
