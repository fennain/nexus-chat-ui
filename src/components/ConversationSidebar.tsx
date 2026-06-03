import {
  AddUserButton,
  Avatar,
  Conversation,
  ConversationHeader,
  Loader,
  Sidebar,
} from "@chatscope/chat-ui-kit-react";
import { TabBar, TabBarItem } from "tdesign-mobile-react";
import { ChatIcon, ChatDoubleIcon, SearchIcon } from "tdesign-icons-react";
import { type CSSProperties, useMemo, useState } from "react";
import type { ContactListItem } from "@/api/interface";
import { useDayJs } from "@/hooks/useDayJs";
import {
  findConversationByUserId,
  getConversationDisplayProfile,
  getUserDisplayProfile,
} from "@/lib/chatConversation";
import { useModalContextSelector } from "@/context/modal-context";
import {
  type ChatSessionTabValue,
  useChatSessionsStore,
} from "@/store/useChatSessionsStore";
import { useChatConnectionStore } from "@/store/useChatConnectionStore";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import {
  Badge,
  Dropdown,
  Empty as SemiEmpty,
  RadioGroup,
  Radio,
} from "@douyinfe/semi-ui";
import type { ComponentType } from "react";
import Group from "@/assets/Group.png";
import { DEFAULT_AVATAR } from "@/constants";

import 'tdesign-mobile-react/es/style/index.css'

interface NexusConversationSidebarProps {
  onSelectConversation: (conversationId: string) => void;
  className?: string;
  style?: CSSProperties;
  conversationContentStyle?: CSSProperties;
  conversationAvatarStyle?: CSSProperties;
}

export function ConversationSidebar({
  onSelectConversation,
  className,
  style,
  conversationContentStyle,
  conversationAvatarStyle,
}: NexusConversationSidebarProps) {
  const Empty = SemiEmpty as unknown as ComponentType<any>;
  const conversations = useChatSessionsStore((state) => state.conversations);
  const channels = useChatSessionsStore((state) => state.channels);
  const activeConversationId = useChatSessionsStore(
    (state) => state.activeConversationId,
  );
  const isConversationsLoading = useChatSessionsStore(
    (state) => state.isConversationsLoading,
  );
  const connectionStatus = useChatConnectionStore(
    (state) => state.connectionStatus,
  );
  const tabbarValue = useChatSessionsStore((state) => state.tabbarValue);
  const setTabbarValue = useChatSessionsStore((state) => state.setTabbarValue);
  const contactList = useChatUsersStore((state) => state.contactList);
  const contactRequestList = useChatUsersStore(
    (state) => state.contactRequestList,
  );
  const currentUser = useChatUsersStore((state) => state.currentUser);
  const allUserList = useChatUsersStore((state) => state.allUserList);
  const { formatDateTime } = useDayJs();
  const setContactDetail = useModalContextSelector(
    (state) => state.setContactDetail,
  );
  const setCreateChannel = useModalContextSelector(
    (state) => state.setCreateChannel,
  );
  const setNewContact = useModalContextSelector((state) => state.setNewContact);
  const setUserSearch = useModalContextSelector((state) => state.setUserSearch);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [contactTab, setContactTab] = useState<"friends" | "groups">("friends");
  const isActionDisabled =
    isConversationsLoading || connectionStatus !== "connected";

  const activeContacts = useMemo(
    () =>
      contactList
        // .filter((contact) => contact.status === "ACTIVE")
        .map((contact) => ({
          ...contact,
        })),
    [contactList],
  );

  const handleOpenUserSearchModal = () => {
    setIsActionsDropdownOpen(false);
    setUserSearch(true);
  };

  const handleOpenNewContactModal = () => {
    setIsActionsDropdownOpen(false);
    setNewContact(true);
  };

  const handleOpenCreateChannelModal = () => {
    setIsActionsDropdownOpen(false);
    setContactTab("groups");
    setCreateChannel(true);
  };

  const handleOpenContactDetail = (contact: ContactListItem) => {
    setContactDetail({
      contactTargetUserId: contact.targetUserId,
    });
  };

  const handleToggleActionsDropdown = () => {
    if (isActionDisabled) {
      return;
    }

    setIsActionsDropdownOpen((open) => !open);
  };

  const channelUnreadCount = channels.reduce(
    (total, item) => total + (item.unreadCount ?? 0),
    0,
  );

  const list = [
    {
      value: "conversations",
      label: "Chats",
      icon: <ChatIcon />,
      badgeCount: conversations.reduce(
        (total, item) => total + (item.unreadCount ?? 0),
        0,
      ),
    },
    {
      value: "contacts",
      label: "Contacts",
      icon: <ChatDoubleIcon />,
      badgeCount: channelUnreadCount,
    },
  ];

  const change = (changeValue: string | number) => {
    setTabbarValue(String(changeValue) as ChatSessionTabValue);
  };

  return (
    <Sidebar
      className={className}
      position="left"
      scrollable={false}
      style={style}
    >
      <ConversationHeader>
        <Avatar
          name={currentUser?.userName ?? currentUser?.userId + ""}
          src={currentUser?.avatarUrl ?? DEFAULT_AVATAR}
        />
        <ConversationHeader.Content
          // info="Active 10 mins ago"
          userName={currentUser?.userName ?? currentUser?.userId + ""}
        />
        <ConversationHeader.Actions>
          <Dropdown
            position="bottomLeft"
            trigger="custom"
            clickToHide
            visible={isActionsDropdownOpen}
            onClickOutSide={() => setIsActionsDropdownOpen(false)}
            render={
              <Dropdown.Menu>
                <Dropdown.Item
                  icon={<ChatIcon />}
                  onClick={handleOpenNewContactModal}
                >
                  {contactRequestList.length > 0 ? (
                    <Badge dot type="danger">
                      <span>New Contact</span>
                    </Badge>
                  ) : (
                    "New Contact"
                  )}
                </Dropdown.Item>
                <Dropdown.Item
                  icon={<SearchIcon />}
                  onClick={handleOpenUserSearchModal}
                >
                  Add Contact
                </Dropdown.Item>
                <Dropdown.Item
                  icon={<ChatDoubleIcon />}
                  onClick={handleOpenCreateChannelModal}
                >
                  Add Channel
                </Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <div onClick={handleToggleActionsDropdown}>
              {contactRequestList.length > 0 ? (
                <Badge dot type="danger">
                  <AddUserButton disabled={isActionDisabled} />
                </Badge>
              ) : (
                <AddUserButton disabled={isActionDisabled} />
              )}
            </div>
          </Dropdown>
        </ConversationHeader.Actions>
      </ConversationHeader>
      {isConversationsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div className="overflow-hidden overflow-y-auto flex-1">
          {tabbarValue === "conversations" ? (
            conversations.length > 0 ? (
              conversations.map((conversation) => {
                const { avatarUrl, displayName } =
                  getConversationDisplayProfile({
                    conversation,
                    allUsers: allUserList,
                    contacts: contactList,
                    currentUserId: currentUser?.userId,
                  });

                return (
                  <Conversation
                    key={conversation._id}
                    active={conversation._id === activeConversationId}
                    unreadCnt={conversation.unreadCount}
                    lastActivityTime={formatDateTime(conversation.updatedAt)}
                    onClick={() => onSelectConversation(conversation._id)}
                  >
                    <Avatar
                      name={displayName}
                      src={avatarUrl ?? DEFAULT_AVATAR}
                      style={conversationAvatarStyle}
                    />
                    <Conversation.Content
                      name={displayName}
                      style={conversationContentStyle}
                    />
                  </Conversation>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-slate-200">
                <Empty description="No direct chats yet" />
              </div>
            )
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex justify-center border-b border-slate-200 px-[12px] py-[8px]">
                <RadioGroup
                  buttonSize="large"
                  type="button"
                  direction="horizontal"
                  value={contactTab}
                  onChange={(event) =>
                    setContactTab(event.target.value as "friends" | "groups")
                  }
                >
                  <Radio value="friends">Friends</Radio>

                  <Radio value="groups">
                    {channelUnreadCount > 0 ? (
                      <Badge count={channelUnreadCount} type="danger">
                      Groups
                      </Badge>
                    ) : (
                      "Groups"
                    )}
                  </Radio>
                </RadioGroup>
              </div>
              <div className="flex-1 overflow-hidden overflow-y-auto">
                {contactTab === "friends" ? (
                  activeContacts.length > 0 ? (
                    activeContacts.map((contact) => {
                      const linkedConversation = findConversationByUserId({
                        conversations,
                        userId: contact.targetUserId,
                      });
                      const { displayName, avatarUrl } = getUserDisplayProfile({
                        userId: contact.targetUserId,
                        alias: contact.alias,
                        allUsers: allUserList,
                      });

                      return (
                        <Conversation
                          key={contact._id}
                          active={
                            linkedConversation?._id === activeConversationId
                          }
                          lastActivityTime={formatDateTime(contact.updatedAt)}
                          onClick={() => handleOpenContactDetail(contact)}
                        >
                          <Avatar
                            name={displayName}
                            src={avatarUrl ?? DEFAULT_AVATAR}
                            style={conversationAvatarStyle}
                          />
                          <Conversation.Content
                            name={displayName}
                            style={conversationContentStyle}
                          />
                        </Conversation>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-slate-200">
                      <Empty description="No friends yet" />
                    </div>
                  )
                ) : channels.length > 0 ? (
                  channels.map((channel) => (
                    <Conversation
                      key={channel._id}
                      active={channel._id === activeConversationId}
                      unreadCnt={channel.unreadCount}
                      lastActivityTime={formatDateTime(channel.updatedAt)}
                      onClick={() => onSelectConversation(channel._id)}
                    >
                      <Avatar
                        name={channel.name}
                        src={Group}
                        style={conversationAvatarStyle}
                      />
                      <Conversation.Content
                        name={channel.name}
                        style={conversationContentStyle}
                      />
                    </Conversation>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-slate-200">
                    <Empty description="No group chats yet" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <TabBar
        value={tabbarValue}
        onChange={change}
        theme="tag"
        fixed={false}
        split={false}
      >
        {list.map((item, i) => (
          <TabBarItem
            key={item.value || i}
            icon={item.icon}
            value={item.value}
            badgeProps={{ count: item.badgeCount }}
          >
            {item.label}
          </TabBarItem>
        ))}
      </TabBar>
    </Sidebar>
  );
}
