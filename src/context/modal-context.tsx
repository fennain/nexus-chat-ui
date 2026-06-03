/* eslint-disable react-refresh/only-export-components */
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  createContext,
  useContext,
  useContextSelector,
} from "use-context-selector";
import { createConversationApi } from "@/api/modules";
import type { ConversationListItem } from "@/api/interface";
import {
  AllUsersModal,
  ContactDetailModal,
  ContactRequest,
  ContactSelectModal,
  CreateChannelModal,
  NewContactModal,
  UserSearchModal,
} from "@/modal";
import {
  findConversationByUserId,
  toChatConversationItem,
} from "@/lib/chatConversation";
import { useChatSessionsStore } from "@/store/useChatSessionsStore";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import type { ChatUserId, ChatUserProfile } from "@/types";

type PopupContainerGetter = () => HTMLElement;
type AllUsersModalMode = "conversation" | "channelMember";

interface ContactRequestState {
  userId?: ChatUserId;
  userName?: string;
  getPopupContainer?: PopupContainerGetter;
}

interface ContactSelectState {
  channelId?: string;
  channelName?: string;
}

interface ContactDetailState {
  contactTargetUserId?: ChatUserId;
}

interface AllUsersState {
  users: ChatUserProfile[];
  mode?: AllUsersModalMode;
  channelId?: string;
  channelName?: string;
}

type ModalContextState = {
  setAllUsers: Dispatch<SetStateAction<AllUsersState | null>>;
  setContactDetail: Dispatch<SetStateAction<ContactDetailState | null>>;
  setContactRequest: Dispatch<SetStateAction<ContactRequestState | null>>;
  setContactSelect: Dispatch<SetStateAction<ContactSelectState | null>>;
  setCreateChannel: Dispatch<SetStateAction<boolean>>;
  setNewContact: Dispatch<SetStateAction<boolean>>;
  setUserSearch: Dispatch<SetStateAction<boolean>>;
};

const ModalContext = createContext<ModalContextState>({
  setAllUsers: () => {},
  setContactDetail: () => {},
  setContactRequest: () => {},
  setContactSelect: () => {},
  setCreateChannel: () => {},
  setNewContact: () => {},
  setUserSearch: () => {},
});

export const useModalContext = () => useContext(ModalContext);

export const useModalContextSelector = <T,>(
  selector: (state: ModalContextState) => T,
): T => useContextSelector(ModalContext, selector);

interface ModalContextProviderProps {
  children: ReactNode;
  getPopupContainer?: PopupContainerGetter;
}

export function ModalContextProvider({
  children,
  getPopupContainer,
}: ModalContextProviderProps) {
  const currentUser = useChatUsersStore((state) => state.currentUser);
  const prependConversation = useChatSessionsStore(
    (state) => state.prependConversation,
  );
  const setActiveConversationId = useChatSessionsStore(
    (state) => state.setActiveConversationId,
  );
  const setTabbarValue = useChatSessionsStore((state) => state.setTabbarValue);
  const [allUsers, setAllUsers] = useState<AllUsersState | null>(null);
  const [contactDetail, setContactDetail] =
    useState<ContactDetailState | null>(null);
  const [contactRequest, setContactRequest] =
    useState<ContactRequestState | null>(null);
  const [contactSelect, setContactSelect] =
    useState<ContactSelectState | null>(null);
  const [createChannel, setCreateChannel] = useState(false);
  const [newContact, setNewContact] = useState(false);
  const [userSearch, setUserSearch] = useState(false);

  const handleOpenOrCreateConversation = useCallback(
    async (targetUserId: ChatUserId) => {
      const linkedConversation = findConversationByUserId({
        conversations: useChatSessionsStore.getState().conversations,
        userId: targetUserId,
      });

      if (linkedConversation?._id) {
        setTabbarValue("conversations");
        setActiveConversationId(linkedConversation._id);
        return;
      }

      const response = await createConversationApi(targetUserId);
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
            targetUserId,
          }),
        );
      }

      setTabbarValue("conversations");
      setActiveConversationId(nextConversation._id);
    },
    [
      currentUser?.userId,
      prependConversation,
      setActiveConversationId,
      setTabbarValue,
    ],
  );

  const contextValue = useMemo<ModalContextState>(
    () => ({
      setAllUsers,
      setContactDetail,
      setContactRequest,
      setContactSelect,
      setCreateChannel,
      setNewContact,
      setUserSearch,
    }),
    [],
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}

      <AllUsersModal
        open={Boolean(allUsers)}
        users={allUsers?.users ?? []}
        mode={allUsers?.mode}
        channelId={allUsers?.channelId}
        channelName={allUsers?.channelName}
        onCancel={() => setAllUsers(null)}
      />
      <NewContactModal
        open={newContact}
        onCancel={() => setNewContact(false)}
      />
      <UserSearchModal
        open={userSearch}
        onCancel={() => setUserSearch(false)}
        onOpenContactRequest={(payload) => {
          setContactRequest({
            ...payload,
            getPopupContainer,
          });
        }}
      />
      <CreateChannelModal
        open={createChannel}
        onCancel={() => setCreateChannel(false)}
      />
      <ContactSelectModal
        open={Boolean(contactSelect)}
        channelId={contactSelect?.channelId}
        channelName={contactSelect?.channelName}
        onCancel={() => setContactSelect(null)}
      />
      <ContactDetailModal
        open={Boolean(contactDetail?.contactTargetUserId)}
        contactTargetUserId={contactDetail?.contactTargetUserId}
        onCancel={() => setContactDetail(null)}
        onSendMessage={handleOpenOrCreateConversation}
      />
      <ContactRequest
        open={Boolean(contactRequest?.userId)}
        userId={contactRequest?.userId}
        userName={contactRequest?.userName}
        getPopupContainer={
          contactRequest?.getPopupContainer ?? getPopupContainer
        }
        onCancel={() => setContactRequest(null)}
      />
    </ModalContext.Provider>
  );
}
