import { Button, Modal, SideSheet, Toast } from "@douyinfe/semi-ui";
import { AddIcon } from "tdesign-icons-react";
import { useMemo, useState } from "react";
import { deleteChannelApi, leaveChannelApi } from "@/api/modules";
import { ChannelAvatar } from "@/components/ChannelAvatar";
import { DEFAULT_AVATAR } from "@/constants";
import { isSameUserId, toUserIdKey } from "@/lib/chatUser";
import { useChatSessionsStore } from "@/store/useChatSessionsStore";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import type { ChatChannelMemberDetail, ChatUserId } from "@/types";

interface ChannelDetailSideSheetProps {
  open: boolean;
  channelId?: string;
  name?: string;
  description?: string;
  createdBy?: ChatUserId;
  currentUserId?: ChatUserId;
  membersDetail?: ChatChannelMemberDetail[];
  isMobile?: boolean;
  getPopupContainer: () => HTMLElement;
  onCancel: () => void;
  onAddMemberClick?: () => void;
}

export function ChannelDetailSideSheet({
  open,
  channelId,
  name,
  description,
  createdBy,
  currentUserId,
  membersDetail = [],
  isMobile = false,
  getPopupContainer,
  onCancel,
  onAddMemberClick,
}: ChannelDetailSideSheetProps) {
  const removeChannel = useChatSessionsStore((state) => state.removeChannel);
  const usersById = useChatUsersStore((state) => state.usersById);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const currentMember = useMemo(
    () =>
      membersDetail.find((member) =>
        isSameUserId(member.userId, currentUserId),
      ),
    [currentUserId, membersDetail],
  );
  const isOwner =
    currentMember?.role === "OWNER" || isSameUserId(createdBy, currentUserId);
  const isBusy = isDeleting || isLeaving;
  const displayName = name?.trim() || "Untitled group chat";
  const displayDescription = description?.trim() || "No group description";
  const channelMembers = useMemo(
    () =>
      membersDetail.map((member) => {
        const userIdKey = toUserIdKey(member.userId);
        const profile = usersById[userIdKey];

        return {
          ...member,
          userIdKey,
          displayName: profile?.userName?.trim() || userIdKey || "Unknown member",
          avatarUrl: profile?.avatarUrl,
        };
      }),
    [membersDetail, usersById],
  );

  const handleDeleteChannel = async () => {
    if (!channelId || isBusy) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteChannelApi(channelId);
      removeChannel(channelId);
      Toast.success("Group chat dissolved");
      onCancel();
    } catch {
      // Toast.error("Failed to dissolve group chat. Please try again later.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveChannel = async () => {
    if (!channelId || isBusy) {
      return;
    }

    setIsLeaving(true);

    try {
      await leaveChannelApi(channelId);
      removeChannel(channelId);
      Toast.success("Left group chat");
      onCancel();
    } catch {
      // Toast.error("Failed to leave group chat. Please try again later.");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleOpenDeleteConfirm = () => {
    if (!channelId || !isOwner || isBusy) {
      return;
    }

    Modal.confirm({
      title: "Dissolve Group Chat",
      content: `After dissolving ${displayName}, all members will no longer be able to use this group chat.`,
      okText: "Dissolve",
      cancelText: "Cancel",
      okButtonProps: {
        type: "danger",
      },
      centered: true,
      maskClosable: false,
      onOk: () => handleDeleteChannel(),
    });
  };

  const handleOpenLeaveConfirm = () => {
    if (!channelId || isOwner || isBusy) {
      return;
    }

    Modal.confirm({
      title: "Leave Group Chat",
      content: `After leaving ${displayName}, you will no longer receive messages from this group chat.`,
      okText: "Leave",
      cancelText: "Cancel",
      okButtonProps: {
        type: "danger",
      },
      centered: true,
      maskClosable: false,
      onOk: () => handleLeaveChannel(),
    });
  };

  const handleInviteMember = () => {
    if (isBusy) {
      return;
    }

    onCancel();
    onAddMemberClick?.();
  };

  const footer = (
    <div className="flex justify-end gap-[12px]">
      {isOwner ? (
        <Button
          type="danger"
          theme="solid"
          loading={isDeleting}
          disabled={!channelId || isBusy}
          onClick={handleOpenDeleteConfirm}
        >
          Dissolve Group Chat
        </Button>
      ) : (
        <Button
          type="danger"
          theme="light"
          loading={isLeaving}
          disabled={!channelId || isBusy}
          onClick={handleOpenLeaveConfirm}
        >
          Leave Group Chat
        </Button>
      )}
    </div>
  );

  return (
    <SideSheet
      visible={open}
      title="Group Details"
      placement="right"
      width={isMobile ? "100%" : 420}
      height="100%"
      footer={footer}
      maskClosable={!isBusy}
      closeOnEsc={!isBusy}
      getPopupContainer={getPopupContainer}
      bodyStyle={{ padding: 0 }}
      style={
        isMobile
          ? {
              width: "100%",
              maxWidth: "100%",
              height: "100%",
            }
          : undefined
      }
      onCancel={() => {
        if (!isBusy) {
          onCancel();
        }
      }}
    >
      <div className="flex h-full flex-col gap-[20px] p-[20px]">
        <section className="flex flex-col gap-[14px] rounded-[8px] bg-slate-50 p-[16px]">
          <div className="flex items-center justify-between gap-[12px]">
            <div className="text-[15px] font-semibold text-slate-900">
              Group Members
            </div>
            <div className="text-[12px] text-slate-500">
              {channelMembers.length}
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-x-[12px] gap-y-[18px]">
            {channelMembers.map((member) => (
              <div
                key={`${member.channelId}-${member.userIdKey}`}
                className="flex min-w-0 flex-col items-center gap-[8px]"
                title={member.displayName}
              >
                <ChannelAvatar
                  channelId={channelId}
                  userId={member.userId}
                  role={member.role}
                  size="medium"
                  avatar={member.avatarUrl ?? DEFAULT_AVATAR}
                  name={member.displayName}
                  showSelfTopSlot
                  getPopupContainer={getPopupContainer}
                />
                <div className="max-w-full truncate text-[12px] leading-[18px] text-slate-500">
                  {member.displayName}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="flex cursor-pointer min-w-0 flex-col items-center gap-[8px] border-0 bg-transparent p-0 text-slate-500 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy}
              onClick={handleInviteMember}
            >
              <span className="flex size-[48px] items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <AddIcon size="18px" />
              </span>
              <span className="max-w-full truncate text-[12px] leading-[18px]">
                Invite
              </span>
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-[8px]">
          <div className="text-[13px] font-medium text-slate-500">Group Name</div>
          <div className="break-words text-[18px] font-semibold leading-[26px] text-slate-900">
            {displayName}
          </div>
        </section>

        <section className="flex flex-col gap-[8px]">
          <div className="text-[13px] font-medium text-slate-500">Group Description</div>
          <div className="whitespace-pre-wrap break-words text-[14px] leading-[24px] text-slate-700">
            {displayDescription}
          </div>
        </section>
      </div>
    </SideSheet>
  );
}

export default ChannelDetailSideSheet;
