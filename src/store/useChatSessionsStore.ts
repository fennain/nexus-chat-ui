import { create } from 'zustand'
import type {
  ChannelRole,
  ChatChannelItem,
  ChatChannelMemberDetail,
  ChatConversationItem,
  ChatMessageItem,
  ChatUserId,
} from '@/types'
import { useChatUsersStore } from '@/store/useChatUsersStore'
import { isSameUserId } from '@/lib/chatUser'

export type ChatSessionTabValue = 'conversations' | 'contacts'
type ChatSessionRoomType = 'CONVERSATION' | 'CHANNEL'
type ChatSessionPatch = {
  roomType?: ChatSessionRoomType
  createdAt?: string
  updatedAt?: string
  hasReq?: boolean
  hasJoin?: boolean
  unreadCount?: number
  historyHasMore?: boolean
  participants?: ChatUserId[]
  members?: ChatUserId[]
  membersDetail?: ChatChannelMemberDetail[]
  membersDetailLoaded?: boolean
  name?: string
  description?: string
  type?: string
  createdBy?: ChatUserId
  e2eeEnabled?: boolean
  senderKeyVersion?: number
}

interface ChatSessionsStore {
  conversations: ChatConversationItem[]
  channels: ChatChannelItem[]
  tabbarValue: ChatSessionTabValue
  activeConversationId?: string
  isConversationsLoading: boolean
  isMessagesLoading: boolean
  setConversations: (conversations: ChatConversationItem[]) => void
  setChannels: (channels: ChatChannelItem[]) => void
  setTabbarValue: (tabbarValue: ChatSessionTabValue) => void
  prependConversation: (conversation: ChatConversationItem) => void
  prependChannel: (channel: ChatChannelItem) => void
  removeChannel: (channelId: string) => void
  removeChannelMember: (channelId: string, userId: ChatUserId) => void
  updateChannelMemberRole: (
    channelId: string,
    userId: ChatUserId,
    role: ChannelRole,
  ) => void
  setConversationMessages: (
    conversationId: string,
    messages: ChatMessageItem[],
    historyHasMore?: boolean,
  ) => void
  setConversationsLoading: (isConversationsLoading: boolean) => void
  setMessagesLoading: (isMessagesLoading: boolean) => void
  setActiveConversationId: (conversationId?: string) => void
  ensureConversation: (
    conversationId: string,
    patch?: ChatSessionPatch,
  ) => void
  appendMessages: (conversationId: string, incomingMessages: ChatMessageItem[]) => void
  updateConversationMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<ChatMessageItem>,
  ) => void
  setConversationUnreadCount: (
    conversationId: string,
    unreadCount: number,
    patch?: ChatMessageItem,
  ) => void
}

const getUniqueMessages = (existing: ChatMessageItem[], incoming: ChatMessageItem[]) => {
  const existedIds = new Set(existing.map((item) => item._id).filter(Boolean))

  const nextItems = incoming.filter((item) => {
    if (!item._id) {
      return true
    }

    if (existedIds.has(item._id)) {
      return false
    }

    existedIds.add(item._id)
    return true
  })

  return nextItems.length > 0 ? [...existing, ...nextItems] : existing
}

const patchMessagesById = (
  messages: ChatMessageItem[],
  messageId: string,
  patch: Partial<ChatMessageItem>,
) => {
  let hasUpdated = false

  const nextMessages = messages.map((item) => {
    if (item._id !== messageId) {
      return item
    }

    hasUpdated = true
    return {
      ...item,
      ...patch,
    }
  })

  return hasUpdated ? nextMessages : messages
}

export const useChatSessionsStore = create<ChatSessionsStore>((set) => ({
  conversations: [],
  channels: [],
  tabbarValue: 'conversations',
  activeConversationId: undefined,
  isConversationsLoading: false,
  isMessagesLoading: false,
  setConversations: (conversations) =>
    set((state) => {
      const nextConversations = conversations.map((conversation) => {
        const existingConversation = state.conversations.find(
          (item) => item._id === conversation._id,
        )

        return existingConversation
          ? {
            ...conversation,
            hasReq: existingConversation.hasReq,
            hasJoin: existingConversation.hasJoin,
            unreadCount: existingConversation.unreadCount,
            historyHasMore: existingConversation.historyHasMore ?? conversation.historyHasMore ?? false,
            msg: existingConversation.msg,
          }
          : {
            ...conversation,
            hasReq: conversation.hasReq ?? false,
            hasJoin: conversation.hasJoin ?? false,
            unreadCount: conversation.unreadCount ?? 0,
            historyHasMore: conversation.historyHasMore ?? false,
          }
      })
      const activeConversationId = state.activeConversationId
      const activeConversationStillExists =
        !activeConversationId ||
        nextConversations.some((conversation) => conversation._id === activeConversationId) ||
        state.channels.some((channel) => channel._id === activeConversationId)

      return {
        conversations: nextConversations,
        activeConversationId: activeConversationStillExists ? activeConversationId : undefined,
      }
    }),
  setChannels: (channels) =>
    set((state) => ({
      channels: channels.map((channel) => {
        const existingChannel = state.channels.find((item) => item._id === channel._id)

        return existingChannel
          ? {
            ...channel,
            hasReq: existingChannel.hasReq,
            hasJoin: existingChannel.hasJoin,
            unreadCount: existingChannel.unreadCount,
            historyHasMore: existingChannel.historyHasMore ?? channel.historyHasMore ?? false,
            membersDetail: existingChannel.membersDetailLoaded
              ? existingChannel.membersDetail
              : channel.membersDetail ?? existingChannel.membersDetail ?? [],
            membersDetailLoaded:
              existingChannel.membersDetailLoaded || Boolean(channel.membersDetail?.length),
            description: channel.description ?? existingChannel.description,
            msg: existingChannel.msg,
          }
          : {
            ...channel,
            hasReq: channel.hasReq ?? false,
            hasJoin: channel.hasJoin ?? false,
            unreadCount: channel.unreadCount ?? 0,
            historyHasMore: channel.historyHasMore ?? false,
            membersDetail: channel.membersDetail ?? [],
            membersDetailLoaded: Boolean(channel.membersDetail?.length),
          }
      }),
    })),
  setTabbarValue: (tabbarValue) => set({ tabbarValue }),
  prependConversation: (conversation) =>
    set((state) => ({
      conversations: [
        {
          ...conversation,
          hasReq: conversation.hasReq ?? false,
          hasJoin: conversation.hasJoin ?? false,
          unreadCount: conversation.unreadCount ?? 0,
          historyHasMore: conversation.historyHasMore ?? false,
        },
        ...state.conversations.filter((item) => item._id !== conversation._id),
      ],
    })),
  prependChannel: (channel) =>
    set((state) => ({
      channels: [
        {
          ...channel,
          hasReq: channel.hasReq ?? false,
          hasJoin: channel.hasJoin ?? false,
          unreadCount: channel.unreadCount ?? 0,
          historyHasMore: channel.historyHasMore ?? false,
          membersDetail: channel.membersDetail ?? [],
          membersDetailLoaded: channel.membersDetailLoaded ?? Boolean(channel.membersDetail?.length),
        },
        ...state.channels.filter((item) => item._id !== channel._id),
      ],
    })),
  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((item) => item._id !== channelId),
      activeConversationId:
        state.activeConversationId === channelId
          ? undefined
          : state.activeConversationId,
    })),
  removeChannelMember: (channelId, userId) =>
    set((state) => ({
      channels: state.channels.map((channel) =>
        channel._id === channelId
          ? {
              ...channel,
              members: channel.members.filter(
                (memberId) => !isSameUserId(memberId, userId),
              ),
              membersDetail: channel.membersDetail.filter(
                (member) => !isSameUserId(member.userId, userId),
              ),
            }
          : channel,
      ),
    })),
  updateChannelMemberRole: (channelId, userId, role) =>
    set((state) => ({
      channels: state.channels.map((channel) =>
        channel._id === channelId
          ? {
              ...channel,
              membersDetail: channel.membersDetail.map((member) =>
                isSameUserId(member.userId, userId)
                  ? {
                      ...member,
                      role,
                    }
                  : member,
              ),
            }
          : channel,
      ),
    })),
  setConversationsLoading: (isConversationsLoading) => set({ isConversationsLoading }),
  setMessagesLoading: (isMessagesLoading) => set({ isMessagesLoading }),
  setConversationMessages: (conversationId, messages, historyHasMore) =>
    set((state) => {
      const existingConversation = state.conversations.find((item) => item._id === conversationId)
      const existingChannel = state.channels.find((item) => item._id === conversationId)

      if (existingConversation) {
        return {
          conversations: state.conversations.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                hasReq: true,
                hasJoin: item.hasJoin ?? false,
                unreadCount: 0,
                historyHasMore: historyHasMore ?? item.historyHasMore ?? false,
                msg: getUniqueMessages(messages, existingConversation.msg),
              }
              : item,
          ),
        }
      }

      if (existingChannel) {
        return {
          channels: state.channels.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                hasReq: true,
                hasJoin: item.hasJoin ?? false,
                unreadCount: 0,
                historyHasMore: historyHasMore ?? item.historyHasMore ?? false,
                msg: getUniqueMessages(messages, existingChannel.msg),
                updatedAt: new Date().toISOString(),
              }
              : item,
          ),
        }
      }

      const now = new Date().toISOString()
      const roomType = messages[0]?.roomType === 'CHANNEL' ? 'CHANNEL' : 'CONVERSATION'

      if (roomType === 'CHANNEL') {
        return {
          channels: [
            ...state.channels,
            {
              _id: conversationId,
              members: [],
              name: '',
              description: '',
              type: 'CHANNEL',
              createdBy: '',
              e2eeEnabled: false,
              senderKeyVersion: 0,
              createdAt: now,
              updatedAt: now,
              hasReq: true,
              hasJoin: false,
              unreadCount: 0,
              historyHasMore: historyHasMore ?? false,
              membersDetail: [],
              membersDetailLoaded: false,
              roomType: 'CHANNEL',
              msg: messages,
            },
          ],
          activeConversationId: state.activeConversationId,
        }
      }

      return {
        conversations: [
          ...state.conversations,
          {
            _id: conversationId,
            participants: [],
            createdAt: now,
            updatedAt: now,
            hasReq: true,
            hasJoin: false,
            unreadCount: 0,
            historyHasMore: historyHasMore ?? false,
            roomType: 'CONVERSATION',
            msg: messages,
          },
        ],
        activeConversationId: state.activeConversationId,
      }
    }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  ensureConversation: (conversationId, patch) =>
    set((state) => {
      const existingConversation = state.conversations.find((item) => item._id === conversationId)
      const existingChannel = state.channels.find((item) => item._id === conversationId)

      if (existingConversation) {
        return {
          conversations: state.conversations.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                ...patch,
                hasReq: patch?.hasReq ?? item.hasReq,
                hasJoin: patch?.hasJoin ?? item.hasJoin,
                unreadCount: patch?.unreadCount ?? item.unreadCount,
                historyHasMore: patch?.historyHasMore ?? item.historyHasMore,
                participants: patch?.participants ?? item.participants,
                updatedAt: patch?.updatedAt ?? item.updatedAt,
              }
              : item,
          ),
        }
      }

      if (existingChannel) {
        return {
          channels: state.channels.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                ...patch,
                roomType: 'CHANNEL',
                hasReq: patch?.hasReq ?? item.hasReq,
                hasJoin: patch?.hasJoin ?? item.hasJoin,
                unreadCount: patch?.unreadCount ?? item.unreadCount,
                historyHasMore: patch?.historyHasMore ?? item.historyHasMore,
                members: patch?.members ?? item.members,
                membersDetail: patch?.membersDetail ?? item.membersDetail,
                membersDetailLoaded: patch?.membersDetailLoaded ?? item.membersDetailLoaded,
                name: patch?.name ?? item.name,
                description: patch?.description ?? item.description,
                type: patch?.type ?? item.type,
                createdBy: patch?.createdBy ?? item.createdBy,
                e2eeEnabled: patch?.e2eeEnabled ?? item.e2eeEnabled,
                senderKeyVersion: patch?.senderKeyVersion ?? item.senderKeyVersion,
                updatedAt: patch?.updatedAt ?? item.updatedAt,
              }
              : item,
          ),
        }
      }

      const now = new Date().toISOString()
      const roomType = patch?.roomType ?? 'CONVERSATION'

      if (roomType === 'CHANNEL') {
        return {
          channels: [
            ...state.channels,
            {
              _id: conversationId,
              members: patch?.members ?? [],
              name: patch?.name ?? '',
              description: patch?.description ?? '',
              type: patch?.type ?? 'CHANNEL',
              createdBy: patch?.createdBy ?? '',
              e2eeEnabled: patch?.e2eeEnabled ?? false,
              senderKeyVersion: patch?.senderKeyVersion ?? 0,
              createdAt: patch?.createdAt ?? now,
              updatedAt: patch?.updatedAt ?? now,
              hasReq: patch?.hasReq ?? false,
              hasJoin: patch?.hasJoin ?? false,
              unreadCount: patch?.unreadCount ?? 0,
              historyHasMore: patch?.historyHasMore ?? false,
              membersDetail: patch?.membersDetail ?? [],
              membersDetailLoaded: patch?.membersDetailLoaded ?? Boolean(patch?.membersDetail?.length),
              roomType: 'CHANNEL',
              msg: [],
            },
          ],
          activeConversationId: state.activeConversationId,
        }
      }

      return {
        conversations: [
          ...state.conversations,
          {
            _id: conversationId,
            participants: patch?.participants ?? [],
            createdAt: patch?.createdAt ?? now,
            updatedAt: patch?.updatedAt ?? now,
            hasReq: patch?.hasReq ?? false,
            hasJoin: patch?.hasJoin ?? false,
            unreadCount: patch?.unreadCount ?? 0,
            historyHasMore: patch?.historyHasMore ?? false,
            roomType: 'CONVERSATION',
            msg: [],
          },
        ],
        activeConversationId: state.activeConversationId,
      }
    }),
  appendMessages: (conversationId, incomingMessages) =>
    set((state) => {
      const existingConversation = state.conversations.find((item) => item._id === conversationId)
      const existingChannel = state.channels.find((item) => item._id === conversationId)
      const roomType = incomingMessages[0]?.roomType === 'CHANNEL' ? 'CHANNEL' : 'CONVERSATION'

      if (existingConversation) {
        return {
          conversations: state.conversations.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                hasReq: item.hasReq ?? false,
                hasJoin: item.hasJoin ?? false,
                unreadCount: item.unreadCount ?? 0,
                msg: getUniqueMessages(item.msg, incomingMessages),
                updatedAt: new Date().toISOString(),
              }
              : item,
          ),
        }
      }

      if (existingChannel) {
        return {
          channels: state.channels.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                hasReq: item.hasReq ?? false,
                hasJoin: item.hasJoin ?? false,
                unreadCount: item.unreadCount ?? 0,
                msg: getUniqueMessages(item.msg, incomingMessages),
                updatedAt: new Date().toISOString(),
              }
              : item,
          ),
        }
      }

      if (roomType === 'CHANNEL') {
        const now = new Date().toISOString()

        return {
          channels: [
            ...state.channels,
            {
              _id: conversationId,
              members: [],
              name: '',
              description: '',
              type: 'CHANNEL',
              createdBy: '',
              e2eeEnabled: false,
              senderKeyVersion: 0,
              createdAt: now,
              updatedAt: now,
              hasReq: false,
              hasJoin: false,
              unreadCount: 0,
              historyHasMore: false,
              membersDetail: [],
              membersDetailLoaded: false,
              roomType: 'CHANNEL',
              msg: incomingMessages,
            },
          ],
          activeConversationId: state.activeConversationId,
        }
      }

      return {
        conversations: [
          ...state.conversations,
          {
            _id: conversationId,
            participants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            hasReq: false,
            hasJoin: false,
            unreadCount: 0,
            historyHasMore: false,
            roomType: 'CONVERSATION',
            msg: incomingMessages,
          },
        ],
        activeConversationId: state.activeConversationId,
      }
    }),
  updateConversationMessage: (conversationId, messageId, patch) =>
    set((state) => {
      const existingConversation = state.conversations.find((item) => item._id === conversationId)
      const existingChannel = state.channels.find((item) => item._id === conversationId)

      if (existingConversation) {
        return {
          conversations: state.conversations.map((item) =>
            item._id === conversationId
              ? {
                  ...item,
                  msg: patchMessagesById(item.msg, messageId, patch),
                  updatedAt: patch.sentAt ?? item.updatedAt,
                }
              : item,
          ),
        }
      }

      if (existingChannel) {
        return {
          channels: state.channels.map((item) =>
            item._id === conversationId
              ? {
                  ...item,
                  msg: patchMessagesById(item.msg, messageId, patch),
                  updatedAt: patch.sentAt ?? item.updatedAt,
                }
              : item,
          ),
        }
      }

      return {}
    }),
  setConversationUnreadCount: (conversationId, unreadCount, patch) =>
    set((state) => {
      const existingConversation = state.conversations.find((item) => item._id === conversationId)
      const existingChannel = state.channels.find((item) => item._id === conversationId)

      if (existingConversation) {
        return {
          conversations: state.conversations.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                unreadCount,
              }
              : item,
          ),
        }
      }

      if (existingChannel) {
        return {
          channels: state.channels.map((item) =>
            item._id === conversationId
              ? {
                ...item,
                unreadCount,
              }
              : item,
          ),
        }
      }

      const now = new Date().toISOString()
      const roomType = patch?.roomType ?? 'CONVERSATION'

      if (roomType === 'CHANNEL') {
        return {
          channels: [
            ...state.channels,
            {
              _id: conversationId,
              members: [],
              name: '',
              description: '',
              type: 'PRIVATE',
              createdBy: '',
              e2eeEnabled: false,
              senderKeyVersion: 0,
              createdAt: now,
              updatedAt: patch?.sentAt ?? now,
              hasReq: false,
              hasJoin: false,
              unreadCount,
              historyHasMore: false,
              membersDetail: [],
              membersDetailLoaded: false,
              roomType: 'CHANNEL',
              msg: [],
            },
          ],
          activeConversationId: state.activeConversationId,
        }
      }

      return {
        conversations: [
          ...state.conversations,
          {
            _id: conversationId,
            participants: [
              patch?.senderId,
              useChatUsersStore.getState().currentUser?.userId,
            ].filter(
              (participant): participant is ChatUserId =>
                participant !== undefined && participant !== null,
            ),
            createdAt: now,
            updatedAt: patch?.sentAt ?? now,
            hasReq: false,
            hasJoin: false,
            unreadCount,
            historyHasMore: false,
            roomType: 'CONVERSATION',
            msg: [],
          },
        ],
        activeConversationId: state.activeConversationId,
      }
    }),
}))
