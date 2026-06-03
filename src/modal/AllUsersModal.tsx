import { Avatar, SendButton } from "@chatscope/chat-ui-kit-react";
import { Empty as SemiEmpty, Pagination, Toast } from "@douyinfe/semi-ui";
import { useEffect, useMemo, useState } from "react";
import { addUserToChannelApi, createConversationApi } from "@/api/modules";
import CommonModal from "@/components/Modal";
import type { ConversationListItem } from "@/api/interface";
import { isSameUserId, toUserIdKey } from "@/lib/chatUser";
import { useChatSessionsStore } from "@/store/useChatSessionsStore";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import { DEFAULT_AVATAR } from "@/constants";
import type { ChatUserId, ChatUserProfile } from "@/types";
import type { ComponentType } from "react";

type AllUsersModalMode = "conversation" | "channelMember";

interface AllUsersModalProps {
  open: boolean;
  users: ChatUserProfile[];
  onCancel: () => void;
  mode?: AllUsersModalMode;
  channelId?: string;
  channelName?: string;
}

const PAGE_SIZE = 8;
const Empty = SemiEmpty as unknown as ComponentType<any>;

export function AllUsersModal({
  open,
  users,
  onCancel,
  mode = "conversation",
  channelId,
  channelName,
}: AllUsersModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [submittingUserId, setSubmittingUserId] = useState<ChatUserId>();
  const currentUser = useChatUsersStore((state) => state.currentUser);
  const conversations = useChatSessionsStore((state) => state.conversations);
  const channels = useChatSessionsStore((state) => state.channels);
  const prependConversation = useChatSessionsStore(
    (state) => state.prependConversation,
  );
  const ensureConversation = useChatSessionsStore((state) => state.ensureConversation);
  const setActiveConversationId = useChatSessionsStore(
    (state) => state.setActiveConversationId,
  );
  const setTabbarValue = useChatSessionsStore((state) => state.setTabbarValue);
  const currentChannel = useMemo(
    () => (channelId ? channels.find((channel) => channel._id === channelId) : undefined),
    [channelId, channels],
  );
  const currentChannelMembers = currentChannel?.members ?? [];

  const filteredUsers = useMemo(
    () => users.filter((user) => !isSameUserId(user.userId, currentUser?.userId)),
    [currentUser?.userId, users],
  );

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredUsers]);

  useEffect(() => {
    if (open) {
      setCurrentPage(1);
    }
  }, [open]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, filteredUsers.length]);

  const handleCreateConversation = async (user: ChatUserProfile) => {
    setSubmittingUserId(user.userId);

    try {
      if (mode === "channelMember") {
        if (!channelId) {
          Toast.error("Missing group chat information");
          return;
        }

        await addUserToChannelApi(channelId, user.userId);
        ensureConversation(channelId, {
          roomType: "CHANNEL",
          members: Array.from(new Set([...currentChannelMembers, user.userId])),
        });
        Toast.success("Member added");
        onCancel();
        return;
      }

      const response = await createConversationApi(user.userId);
      const payload = response as unknown as
        | ConversationListItem
        | { data?: ConversationListItem };
      const nextConversation = "_id" in payload ? payload : payload.data;

      if (!nextConversation?._id) {
        Toast.error("Failed to create conversation");
        return;
      }

      const existedConversation = conversations.find(
        (conversation) => conversation._id === nextConversation._id,
      );

      if (!existedConversation) {
        prependConversation({
          _id: nextConversation._id,
          participants:
            nextConversation.participants ??
            [currentUser?.userId, user.userId].filter(
              (participant): participant is ChatUserId =>
                participant !== undefined && participant !== null,
            ),
          createdAt: nextConversation.createdAt ?? new Date().toISOString(),
          updatedAt: nextConversation.updatedAt ?? new Date().toISOString(),
          msg: [],
          roomType: "CONVERSATION",
        });
      }
      setTabbarValue("conversations");
      setActiveConversationId(nextConversation._id);
      onCancel();
    } catch {
      // Toast.error(
      //   mode === "channelMember"
      //     ? "Failed to add member. Please try again later."
      //     : "Failed to create conversation. Please try again later.",
      // );
    } finally {
      setSubmittingUserId(undefined);
    }
  };

  const title = mode === "channelMember" ? "Add Group Members" : "All Users";
  const description =
    mode === "channelMember"
      ? `${channelName ?? currentChannel?.name ?? "Current group chat"}: ${filteredUsers.length} available users`
      : `${filteredUsers.length} users`;

  return (
    <CommonModal
      open={open}
      onCancel={onCancel}
      title={title}
      description={description}
      width={640}
    >
      <div className="flex min-h-[360px] flex-col pb-[30px]">
        {paginatedUsers.length > 0 ? (
          <div className="flex flex-1 flex-col divide-y divide-slate-100 overflow-hidden rounded-[8px] border border-slate-200 bg-white">
            {paginatedUsers.map((user) => (
              <div
                key={toUserIdKey(user.userId)}
                className="flex items-center gap-[12px] px-[16px] py-[12px]"
              >
                <Avatar
                  name={user.userName ?? String(user.userId)}
                  src={user.avatarUrl ?? DEFAULT_AVATAR}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-slate-900">
                    {user.userName ?? "Unnamed user"}
                  </div>
                  <div className="truncate text-[12px] text-slate-500">
                    {user.userId}
                  </div>
                </div>
                <SendButton
                  border
                  disabled={
                    submittingUserId !== undefined ||
                    (mode === "channelMember" &&
                      currentChannelMembers.some((memberId) =>
                        isSameUserId(memberId, user.userId),
                      ))
                  }
                  onClick={() => void handleCreateConversation(user)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-[8px] border border-dashed border-slate-200">
            <Empty description="No users available" />
          </div>
        )}
        <div className="mt-[16px] flex justify-end">
          <Pagination
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            total={filteredUsers.length}
            onPageChange={setCurrentPage}
            hideOnSinglePage
            showSizeChanger={false}
          />
        </div>
      </div>
    </CommonModal>
  );
}

export default AllUsersModal;
