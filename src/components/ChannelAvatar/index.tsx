import { Avatar, Dropdown, Modal, Toast } from "@douyinfe/semi-ui";
import { useMemo, useState, type ComponentProps } from "react";
import {
  createConversationApi,
  removeChannelMemberApi,
  updateChannelMemberRoleApi,
} from "@/api/modules";
import type { ConversationListItem } from "@/api/interface";
import { useModalContextSelector } from "@/context/modal-context";
import { DEFAULT_AVATAR } from "@/constants";
import {
  findConversationByUserId,
  toChatConversationItem,
} from "@/lib/chatConversation";
import { hasUserId, isSameUserId, toUserIdKey } from "@/lib/chatUser";
import { useChatSessionsStore } from "@/store/useChatSessionsStore";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import type { ChannelRole, ChatUserId } from "@/types";

interface ChannelAvatarProps {
  channelId?: string;
  userId?: ChatUserId;
  name?: string;
  avatar?: string;
  role?: ChannelRole;
  size?: ComponentProps<typeof Avatar>["size"];
  className?: string;
  showSelfTopSlot?: boolean;
  getPopupContainer?: () => HTMLElement;
}

export function ChannelAvatar({
  channelId,
  userId,
  name,
  avatar,
  role,
  size = "small",
  className,
  showSelfTopSlot = false,
}: ChannelAvatarProps) {
  const currentUser = useChatUsersStore((state) => state.currentUser);
  const contactList = useChatUsersStore((state) => state.contactList);
  const usersById = useChatUsersStore((state) => state.usersById);
  const conversations = useChatSessionsStore((state) => state.conversations);
  const channels = useChatSessionsStore((state) => state.channels);
  const prependConversation = useChatSessionsStore(
    (state) => state.prependConversation,
  );
  const setTabbarValue = useChatSessionsStore((state) => state.setTabbarValue);
  const setActiveConversationId = useChatSessionsStore(
    (state) => state.setActiveConversationId,
  );
  const removeChannelMember = useChatSessionsStore(
    (state) => state.removeChannelMember,
  );
  const updateChannelMemberRole = useChatSessionsStore(
    (state) => state.updateChannelMemberRole,
  );
  const setContactRequest = useModalContextSelector(
    (state) => state.setContactRequest,
  );
  const [isSending, setIsSending] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const channel = useMemo(
    () =>
      channelId
        ? channels.find((channelItem) => channelItem._id === channelId)
        : undefined,
    [channelId, channels],
  );
  const userIdKey = toUserIdKey(userId);
  const profile = userIdKey ? usersById[userIdKey] : undefined;
  const displayName =
    name?.trim() || profile?.userName?.trim() || userIdKey || "Unknown member";
  const avatarUrl = avatar || profile?.avatarUrl || DEFAULT_AVATAR;
  const contact = useMemo(
    () =>
      hasUserId(userId)
        ? contactList.find((item) => isSameUserId(item.targetUserId, userId))
        : undefined,
    [contactList, userId],
  );
  const targetMember = useMemo(
    () =>
      hasUserId(userId)
        ? channel?.membersDetail.find((member) =>
            isSameUserId(member.userId, userId),
          )
        : undefined,
    [channel?.membersDetail, userId],
  );
  const currentMember = useMemo(
    () =>
      hasUserId(currentUser?.userId)
        ? channel?.membersDetail.find((member) =>
            isSameUserId(member.userId, currentUser?.userId),
          )
        : undefined,
    [channel?.membersDetail, currentUser?.userId],
  );
  const targetRole = targetMember?.role ?? role;
  const isSelf = isSameUserId(userId, currentUser?.userId);
  const isFriend = Boolean(contact);
  const isCurrentUserOwner =
    currentMember?.role === "OWNER" ||
    isSameUserId(channel?.createdBy, currentUser?.userId);
  const isCurrentUserAdmin = currentMember?.role === "ADMIN";
  const hasManageableTargetRole =
    targetRole === "ADMIN" || targetRole === "MEMBER";
  const canSendMessage = hasUserId(userId) && !isSelf && isFriend;
  const canAddContact = hasUserId(userId) && !isSelf && !isFriend;
  const canRemoveMember =
    Boolean(channelId) &&
    hasUserId(userId) &&
    !isSelf &&
    hasManageableTargetRole &&
    (isCurrentUserOwner || isCurrentUserAdmin);
  const canManageAdmin =
    Boolean(channelId) &&
    hasUserId(userId) &&
    !isSelf &&
    hasManageableTargetRole &&
    isCurrentUserOwner;
  const nextRole: ChannelRole = targetRole === "ADMIN" ? "MEMBER" : "ADMIN";
  const isBusy = isSending || isRemoving || isUpdatingRole;

  const handleSendMessage = async () => {
    if (!hasUserId(userId) || isBusy) {
      return;
    }

    if (contact?.status === "BLOCKED") {
      Toast.warning("This friend is blocked. Messages cannot be sent.");
      return;
    }

    setIsSending(true);

    try {
      const linkedConversation = findConversationByUserId({
        conversations,
        userId,
      });

      if (linkedConversation?._id) {
        setTabbarValue("conversations");
        setActiveConversationId(linkedConversation._id);
        return;
      }

      const response = await createConversationApi(userId);
      const payload = response as unknown as
        | ConversationListItem
        | { data?: ConversationListItem };
      const nextConversation = "_id" in payload ? payload : payload.data;

      if (!nextConversation?._id) {
        throw new Error("Failed to create conversation");
      }

      const existedConversation = useChatSessionsStore
        .getState()
        .conversations.find(
          (conversation) => conversation._id === nextConversation._id,
        );

      if (!existedConversation) {
        prependConversation(
          toChatConversationItem({
            conversation: nextConversation,
            currentUserId: currentUser?.userId,
            targetUserId: userId,
          }),
        );
      }

      setTabbarValue("conversations");
      setActiveConversationId(nextConversation._id);
    } catch {
      // Toast.error("Failed to create conversation. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenRequestModal = () => {
    if (!hasUserId(userId) || isBusy) {
      return;
    }

    setContactRequest({
      userId,
      userName: displayName,
    });
  };

  const handleRemoveMember = async () => {
    if (!channelId || !hasUserId(userId) || isBusy) {
      return;
    }

    setIsRemoving(true);

    try {
      await removeChannelMemberApi(channelId, userId);
      removeChannelMember(channelId, userId);
      Toast.success("Removed from group chat");
    } catch {
      // Toast.error("Failed to remove member. Please try again later.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleOpenRemoveConfirm = () => {
    if (!canRemoveMember || isBusy) {
      return;
    }

    Modal.confirm({
      title: "Remove Member",
      content: `Remove ${displayName} from this group chat?`,
      okText: "Remove",
      cancelText: "Cancel",
      okButtonProps: {
        type: "danger",
      },
      centered: true,
      maskClosable: false,
      onOk: () => handleRemoveMember(),
    });
  };

  const handleUpdateRole = async () => {
    if (!channelId || !hasUserId(userId) || !canManageAdmin || isBusy) {
      return;
    }

    setIsUpdatingRole(true);

    try {
      await updateChannelMemberRoleApi(channelId, userId, nextRole);
      updateChannelMemberRole(channelId, userId, nextRole);
      Toast.success(nextRole === "ADMIN" ? "Admin role assigned" : "Admin role removed");
    } catch {
      // Toast.error("Failed to update member role. Please try again later.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const avatarNode = (
    <Avatar
      size={size}
      src={avatarUrl}
      alt={displayName}
      topSlot={
        showSelfTopSlot && isSelf
          ? {
              text: "Me",
              textColor: "white",
              className: "",
            }
          : undefined
      }
      className={className}
    >
      {displayName.slice(0, 1)}
    </Avatar>
  );
  const hasActions =
    Boolean(channelId) &&
    (canSendMessage || canAddContact || canRemoveMember || canManageAdmin);

  return (
    <>
      {hasActions ? (
        <Dropdown
          trigger="click"
          position="bottomLeft"
          clickToHide
          render={
            <Dropdown.Menu>
              {canSendMessage ? (
                <Dropdown.Item
                  disabled={isBusy}
                  onClick={() => void handleSendMessage()}
                >
                  Send Message
                </Dropdown.Item>
              ) : null}
              {canAddContact ? (
                <Dropdown.Item
                  disabled={isBusy}
                  onClick={handleOpenRequestModal}
                >
                  Add Friend
                </Dropdown.Item>
              ) : null}
              {canRemoveMember ? (
                <Dropdown.Item
                  disabled={isBusy}
                  onClick={handleOpenRemoveConfirm}
                >
                  <span className="text-red-600">Remove from Group</span>
                </Dropdown.Item>
              ) : null}
              {canManageAdmin ? (
                <Dropdown.Item
                  disabled={isBusy}
                  onClick={() => void handleUpdateRole()}
                >
                  {targetRole === "ADMIN" ? "Remove Admin" : "Set Admin"}
                </Dropdown.Item>
              ) : null}
            </Dropdown.Menu>
          }
        >
          <button
            type="button"
            className="block cursor-pointer border-0 bg-transparent p-0"
            title={displayName}
          >
            {avatarNode}
          </button>
        </Dropdown>
      ) : (
        avatarNode
      )}
    </>
  );
}

export default ChannelAvatar;
