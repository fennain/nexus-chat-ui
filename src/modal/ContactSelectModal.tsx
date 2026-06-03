import { Avatar, SendButton } from "@chatscope/chat-ui-kit-react";
import { Empty as SemiEmpty, Pagination, Toast } from "@douyinfe/semi-ui";
import { useEffect, useMemo, useState } from "react";
import { addUserToChannelApi } from "@/api/modules";
import CommonModal from "@/components/Modal";
import { isSameUserId, toUserIdKey } from "@/lib/chatUser";
import { useChatSessionsStore } from "@/store/useChatSessionsStore";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import { DEFAULT_AVATAR } from "@/constants";
import type { ChatUserId } from "@/types";
import type { ComponentType } from "react";

interface ContactSelectModalProps {
  open: boolean;
  onCancel: () => void;
  channelId?: string;
  channelName?: string;
}

const PAGE_SIZE = 8;
const Empty = SemiEmpty as unknown as ComponentType<any>;

export function ContactSelectModal({
  open,
  onCancel,
  channelId,
  channelName,
}: ContactSelectModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [submittingUserId, setSubmittingUserId] = useState<ChatUserId>();
  const currentUser = useChatUsersStore((state) => state.currentUser);
  const contactList = useChatUsersStore((state) => state.contactList);
  const usersById = useChatUsersStore((state) => state.usersById);
  const channels = useChatSessionsStore((state) => state.channels);
  const ensureConversation = useChatSessionsStore(
    (state) => state.ensureConversation,
  );

  const currentChannel = useMemo(
    () =>
      channelId
        ? channels.find((channel) => channel._id === channelId)
        : undefined,
    [channelId, channels],
  );
  const currentChannelMembers = currentChannel?.members ?? [];

  const filteredContacts = useMemo(
    () =>
      contactList.filter(
        (contact) => !isSameUserId(contact.targetUserId, currentUser?.userId),
      ),
    [contactList, currentUser?.userId],
  );

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredContacts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredContacts]);

  useEffect(() => {
    if (open) {
      setCurrentPage(1);
    }
  }, [open]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(filteredContacts.length / PAGE_SIZE),
    );

    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, filteredContacts.length]);

  const handleAddMember = async (targetUserId: ChatUserId) => {
    setSubmittingUserId(targetUserId);

    try {
      if (!channelId) {
        Toast.error("Missing group chat information");
        return;
      }

      await addUserToChannelApi(channelId, targetUserId);
      const fallbackMembers = Array.from(
        new Set([...currentChannelMembers, targetUserId]),
      );

      ensureConversation(channelId, {
        roomType: "CHANNEL",
        members: fallbackMembers,
      });

      Toast.success("Member added");
      onCancel();
    } catch {
      // Toast.error("Failed to add member. Please try again later.");
    } finally {
      setSubmittingUserId(undefined);
    }
  };

  const title = "Add Group Members";
  const description = `${channelName ?? currentChannel?.name ?? "Current group chat"}: ${filteredContacts.length} available friends`;

  return (
    <CommonModal
      open={open}
      onCancel={onCancel}
      title={title}
      description={description}
      width={640}
    >
      <div className="flex min-h-[360px] flex-col pb-[30px]">
        {paginatedContacts.length > 0 ? (
          <div className="flex flex-1 flex-col divide-y divide-slate-100 overflow-hidden rounded-[8px] border border-slate-200 bg-white">
            {paginatedContacts.map((contact) => {
              const contactIdKey = toUserIdKey(contact.targetUserId);
              const userProfile = usersById[contactIdKey];
              const displayName =
                contact.alias?.trim() ||
                userProfile?.userName ||
                String(contact.targetUserId);
              const avatarUrl = userProfile?.avatarUrl;

              return (
                <div
                  key={contact._id}
                  className="flex items-center gap-[12px] px-[16px] py-[12px]"
                >
                  <Avatar
                    name={displayName}
                    src={avatarUrl ?? DEFAULT_AVATAR}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-slate-900">
                      {displayName}
                    </div>
                    <div className="truncate text-[12px] text-slate-500">
                      {contact.targetUserId}
                    </div>
                  </div>
                  <SendButton
                    border
                    disabled={
                      submittingUserId !== undefined ||
                      currentChannelMembers.some((memberId) =>
                        isSameUserId(memberId, contact.targetUserId),
                      )
                    }
                    onClick={() => void handleAddMember(contact.targetUserId)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-[8px] border border-dashed border-slate-200">
            <Empty description="No friends available" />
          </div>
        )}
        <div className="mt-[16px] flex justify-end">
          <Pagination
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            total={filteredContacts.length}
            onPageChange={setCurrentPage}
            hideOnSinglePage
            showSizeChanger={false}
          />
        </div>
      </div>
    </CommonModal>
  );
}

export default ContactSelectModal;
