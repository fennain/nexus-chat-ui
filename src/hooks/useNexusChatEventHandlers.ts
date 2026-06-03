import { Toast } from '@douyinfe/semi-ui'
import { useCallback, useRef, type MutableRefObject } from 'react'
import {
  getChannelMembersApi,
  getContactsApi,
  getContactRequestsApi,
} from '@/api/modules'
import { isSameUserId } from '@/lib/chatUser'
import { useChatSessionsStore } from '@/store/useChatSessionsStore'
import { useChatUsersStore } from '@/store/useChatUsersStore'
import type {
  ContactListItem,
  ContactRequestItem,
} from '@/api/interface'
import type {
  ChatAttachmentKind,
  ChannelRole,
  ChatChannelItem,
  ChatChannelMemberDetail,
  ChatConversationItem,
  ChatMessageItem,
  ChatUserId,
} from '@/types'
import type { SyncUsersFromRelatedListsArgs } from '@/hooks/useNexusChatProfiles'
import { useScroll } from './useScroll'
import { parseJoinedRoom } from '@/hooks/useNexusChatRoomLifecycle'

interface UseNexusChatEventHandlersOptions {
  userId?: ChatUserId
  activeConversation?: ChatConversationItem | ChatChannelItem
  resolvedActiveConversationId?: string
  pendingJoinRoomIdsRef: MutableRefObject<Set<string>>
  syncUsersFromRelatedLists: (args: SyncUsersFromRelatedListsArgs) => Promise<void>
  onMessageReceive?: (message: ChatMessageItem) => void
  onError?: (error: unknown) => void
}

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const toUserId = (value: unknown): ChatUserId | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined

const getChannelIdFromEventData = (data?: Record<string, unknown>) => {
  if (typeof data?.channelId === 'string') {
    return data.channelId
  }

  if (typeof data?.roomId === 'string') {
    return data.roomId
  }

  return undefined
}

const normalizeChannelRole = (value: unknown): ChannelRole | undefined =>
  value === 'OWNER' || value === 'ADMIN' || value === 'MEMBER'
    ? value
    : undefined

const normalizeRoomType = (roomType?: unknown): ChatMessageItem['roomType'] =>
  roomType === 'CHANNEL' ? 'CHANNEL' : 'CONVERSATION'

const normalizeAttachmentKind = (value: unknown): ChatAttachmentKind | undefined =>
  value === 'IMAGE' || value === 'FILE' || value === 'AUDIO'
    ? value
    : undefined

const normalizeSocketAttachment = (value: unknown): ChatMessageItem['attachment'] => {
  const attachment = toRecord(value)
  const kind = normalizeAttachmentKind(attachment?.kind)

  if (
    !attachment ||
    !kind ||
    typeof attachment.url !== 'string' ||
    typeof attachment.name !== 'string' ||
    typeof attachment.mime !== 'string'
  ) {
    return undefined
  }

  return {
    fileId: typeof attachment.fileId === 'string' ? attachment.fileId : attachment.url,
    objectKey: typeof attachment.objectKey === 'string' ? attachment.objectKey : undefined,
    url: attachment.url,
    thumbnailUrl:
      typeof attachment.thumbnailUrl === 'string' ? attachment.thumbnailUrl : undefined,
    name: attachment.name,
    mime: attachment.mime,
    size: typeof attachment.size === 'number' ? attachment.size : 0,
    kind,
    width: typeof attachment.width === 'number' ? attachment.width : undefined,
    height: typeof attachment.height === 'number' ? attachment.height : undefined,
    duration: typeof attachment.duration === 'number' ? attachment.duration : undefined,
  }
}

const normalizeSocketMessage = (
  value: unknown,
  options: { requireText?: boolean } = {},
): ChatMessageItem | undefined => {
  const record = toRecord(value)
  const payload = toRecord(record?.data) ?? record
  const encryption = toRecord(payload?.encryption)
  const text = typeof encryption?.text === 'string' ? encryption.text : undefined
  const attachment = normalizeSocketAttachment(payload?.attachment)

  if (!payload || (options.requireText && !text?.trim() && !attachment)) {
    return undefined
  }

  return {
    _id: typeof payload._id === 'string' ? payload._id : undefined,
    roomId: typeof payload.roomId === 'string' ? payload.roomId : undefined,
    roomType: normalizeRoomType(payload.roomType),
    senderId: toUserId(payload.senderId),
    type: typeof payload.type === 'string' ? payload.type : undefined,
    status: typeof payload.status === 'string' ? payload.status : undefined,
    encryption: {
      id: typeof encryption?.id === 'string' ? encryption.id : undefined,
      scheme: typeof encryption?.scheme === 'string' ? encryption.scheme : undefined,
      text,
    },
    attachment,
    sentAt: typeof payload.sentAt === 'string' ? payload.sentAt : undefined,
  }
}

const getUnreadCountByConversationId = (conversationId: string) => {
  const { conversations, channels } = useChatSessionsStore.getState()
  const conversation = conversations.find((item) => item._id === conversationId)
  const channel = channels.find((item) => item._id === conversationId)

  return conversation?.unreadCount ?? channel?.unreadCount ?? 0
}

/**
 * 负责实时消息与 Socket 事件编排：
 * - 处理消息追加与未读红点；
 * - 维护乐观发送的待确认队列；
 * - 响应 contact / channel / room / message 相关事件。
 */
export function useNexusChatEventHandlers({
  userId,
  activeConversation,
  resolvedActiveConversationId,
  pendingJoinRoomIdsRef,
  syncUsersFromRelatedLists,
  onMessageReceive,
  onError,
}: UseNexusChatEventHandlersOptions) {
  const { scrollToBottom } = useScroll()
  const ensureConversation = useChatSessionsStore((state) => state.ensureConversation)
  const appendMessagesToConversation = useChatSessionsStore((state) => state.appendMessages)
  const setConversationUnreadCount = useChatSessionsStore(
    (state) => state.setConversationUnreadCount,
  )
  const updateConversationMessage = useChatSessionsStore(
    (state) => state.updateConversationMessage,
  )
  const removeChannel = useChatSessionsStore((state) => state.removeChannel)
  const removeChannelMember = useChatSessionsStore((state) => state.removeChannelMember)
  const updateChannelMemberRole = useChatSessionsStore(
    (state) => state.updateChannelMemberRole,
  )
  const upsertUsersFromMessages = useChatUsersStore((state) => state.upsertUsersFromMessages)
  const setContactList = useChatUsersStore((state) => state.setContactList)
  const setContactRequestList = useChatUsersStore((state) => state.setContactRequestList)
  const pendingOptimisticMessagesRef = useRef<Array<{ localId: string; roomId: string }>>([])

  const appendMessages = useCallback(
    (incomingMessages: ChatMessageItem[], conversationId?: string) => {
      const targetConversationId =
        conversationId ?? incomingMessages[0]?.roomId ?? resolvedActiveConversationId

      if (!targetConversationId) {
        incomingMessages.forEach((item) => {
          onMessageReceive?.(item)
        })
        return
      }

      ensureConversation(targetConversationId, {
        roomType: incomingMessages[0]?.roomType === 'CHANNEL' ? 'CHANNEL' : 'CONVERSATION',
      })
      appendMessagesToConversation(
        targetConversationId,
        incomingMessages.map((item) => ({
          ...item,
          roomId: item.roomId ?? targetConversationId,
        })),
      )

      incomingMessages.forEach((item) => {
        onMessageReceive?.(item)
      })
    },
    [
      appendMessagesToConversation,
      ensureConversation,
      onMessageReceive,
      resolvedActiveConversationId,
    ],
  )

  const handleIncomingMessages = useCallback(
    (incomingMessages: ChatMessageItem[]) => {
      upsertUsersFromMessages(incomingMessages)

      const groupedMessages = incomingMessages.reduce<Record<string, ChatMessageItem[]>>(
        (acc, message) => {
          const targetConversationId = message.roomId ?? resolvedActiveConversationId

          if (!targetConversationId) {
            return acc
          }

          if (!acc[targetConversationId]) {
            acc[targetConversationId] = []
          }

          acc[targetConversationId].push(message)
          return acc
        },
        {},
      )

      Object.entries(groupedMessages).forEach(([conversationId, messages]) => {
        appendMessages(messages, conversationId)
      })
    },
    [appendMessages, resolvedActiveConversationId, upsertUsersFromMessages],
  )

  const handleNotifyMessage = useCallback(
    (message: ChatMessageItem) => {
      if (!message.roomId || isSameUserId(message.senderId, userId)) {
        return
      }

      if (message.roomId === resolvedActiveConversationId && activeConversation?.hasReq) {
        return
      }

      setConversationUnreadCount(message.roomId, getUnreadCountByConversationId(message.roomId) + 1, message)
    },
    [
      activeConversation?.hasReq,
      resolvedActiveConversationId,
      setConversationUnreadCount,
      userId,
    ],
  )

  const trackOptimisticMessage = useCallback((localId: string, roomId: string) => {
    pendingOptimisticMessagesRef.current.push({ localId, roomId })
  }, [])

  const handleSocketEvent = useCallback(
    async (eventName: string, payload?: unknown) => {
      const data =
        typeof payload === 'object' && payload !== null && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : undefined

      if (eventName === 'message:new') {
        const message = normalizeSocketMessage(payload, { requireText: true })

        if (!message || isSameUserId(message.senderId, userId)) {
          return
        }

        handleIncomingMessages([message])

        if (message.roomId) {
          setConversationUnreadCount(
            message.roomId,
            getUnreadCountByConversationId(message.roomId) + 1,
            message,
          )
        }
        scrollToBottom()
        return
      }

      if (eventName === 'message:notify') {
        const message = normalizeSocketMessage(payload)

        if (message) {
          handleNotifyMessage(message)
        }

        return
      }

      if (eventName === 'message:sent') {
        const roomId = typeof data?.roomId === 'string' ? data.roomId : undefined
        const messageId = typeof data?._id === 'string' ? data._id : undefined

        if (!roomId || !messageId) {
          return
        }

        const pendingMessageIndex = pendingOptimisticMessagesRef.current.findIndex(
          (item) => item.roomId === roomId,
        )

        if (pendingMessageIndex === -1) {
          return
        }

        const [pendingMessage] = pendingOptimisticMessagesRef.current.splice(
          pendingMessageIndex,
          1,
        )

        updateConversationMessage(roomId, pendingMessage.localId, {
          _id: messageId,
          roomId,
          roomType: data?.roomType === 'CHANNEL' ? 'CHANNEL' : 'CONVERSATION',
          senderId:
            typeof data?.senderId === 'string' || typeof data?.senderId === 'number'
              ? data.senderId
              : userId,
          status: 'sent',
        })
        scrollToBottom()
        return
      }

      if (eventName === 'room:joined') {
        const joinedRoom = typeof data?.room === 'string' ? data.room : undefined
        const parsedRoom = parseJoinedRoom(joinedRoom)

        if (parsedRoom) {
          pendingJoinRoomIdsRef.current.delete(parsedRoom.roomId)
          ensureConversation(parsedRoom.roomId, {
            roomType: parsedRoom.roomType,
            hasJoin: true,
          })
        }

        return
      }

      if (eventName === 'error') {
        if (resolvedActiveConversationId) {
          pendingJoinRoomIdsRef.current.delete(resolvedActiveConversationId)
        }

        const pendingMessage = pendingOptimisticMessagesRef.current.shift()
        const targetConversationId = pendingMessage?.roomId ?? resolvedActiveConversationId

        if (pendingMessage) {
          updateConversationMessage(pendingMessage.roomId, pendingMessage.localId, {
            status: 'error',
          })
        }

        const message =
          typeof data?.message === 'string' && data.message.trim()
            ? data.message.trim()
            : 'Operation failed'

        if (targetConversationId) {
          const localId = `local-system-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

          appendMessages(
            [
              {
                _id: localId,
                roomId: targetConversationId,
                roomType: activeConversation?.roomType ?? 'CONVERSATION',
                type: 'SYSTEAM',
                encryption: {
                  id: localId,
                  scheme: 'NONE',
                  text: message,
                },
                sentAt: new Date().toISOString(),
              },
            ],
            targetConversationId,
          )
          scrollToBottom()
        }

        Toast.error(message)
        return
      }

      if (eventName === 'contact:request') {
        if (
          data &&
          (typeof data.toUserId === 'string' || typeof data.toUserId === 'number') &&
          userId !== undefined &&
          !isSameUserId(data.toUserId, userId)
        ) {
          return
        }

        try {
          const response = await getContactRequestsApi()
          const contactRequestPayload = response as {
            data?: ContactRequestItem[]
          }

          setContactRequestList(contactRequestPayload.data ?? [])
        } catch (error) {
          onError?.(error)
        }
        return
      }

      if (eventName === 'contact:accepted') {
        try {
          const response = await getContactsApi()
          const contactPayload = response as {
            data?: ContactListItem[]
          }
          const nextContactList = contactPayload.data ?? []

          setContactList(nextContactList)

          await syncUsersFromRelatedLists({
            conversations: useChatSessionsStore.getState().conversations,
            channels: useChatSessionsStore.getState().channels,
            contacts: nextContactList,
            contactRequests: useChatUsersStore.getState().contactRequestList,
          })
        } catch (error) {
          onError?.(error)
        }

        return
      }

      if (eventName === 'channel:channel_del') {
        const channelId = getChannelIdFromEventData(data)

        if (!channelId) {
          return
        }

        const hasChannel = useChatSessionsStore
          .getState()
          .channels.some((channel) => channel._id === channelId)

        if (!hasChannel) {
          return
        }

        removeChannel(channelId)
        return
      }

      if (eventName === 'channel:member_del') {
        const channelId = getChannelIdFromEventData(data)
        const memberId = toUserId(data?.memberId)

        if (!channelId || memberId === undefined) {
          return
        }

        const channel = useChatSessionsStore
          .getState()
          .channels.find((channelItem) => channelItem._id === channelId)

        if (!channel) {
          return
        }

        if (isSameUserId(memberId, userId)) {
          removeChannel(channelId)
          return
        }

        const hasMember =
          channel.members.some((item) => isSameUserId(item, memberId)) ||
          channel.membersDetail.some((item) => isSameUserId(item.userId, memberId))

        if (!hasMember) {
          return
        }

        removeChannelMember(channelId, memberId)
        return
      }

      if (eventName === 'channel:role_update') {
        const channelId = getChannelIdFromEventData(data)
        const memberId = toUserId(data?.memberId)
        const nextRole = normalizeChannelRole(data?.newRole)

        if (!channelId || memberId === undefined || !nextRole) {
          return
        }

        const member = useChatSessionsStore
          .getState()
          .channels.find((channel) => channel._id === channelId)
          ?.membersDetail.find((item) => isSameUserId(item.userId, memberId))

        if (!member || member.role === nextRole) {
          return
        }

        updateChannelMemberRole(channelId, memberId, nextRole)
        return
      }

      if (eventName === 'channel:member_added') {
        if (!data) {
          return
        }

        const channel = toRecord(data.channel)
        const channelId =
          (typeof channel?._id === 'string' && channel._id) ||
          getChannelIdFromEventData(data) ||
          undefined

        if (!channelId) {
          return
        }

        const channelMembers = Array.isArray(channel?.members)
          ? channel.members.filter(
            (member): member is ChatUserId =>
              typeof member === 'string' || typeof member === 'number',
          )
          : undefined

        ensureConversation(channelId, {
          roomType: 'CHANNEL',
          members: channelMembers,
          name: typeof channel?.name === 'string' ? channel.name : undefined,
          description:
            typeof channel?.description === 'string' ? channel.description : undefined,
          type: typeof channel?.type === 'string' ? channel.type : undefined,
          createdBy: toUserId(channel?.createdBy),
          e2eeEnabled:
            typeof channel?.e2eeEnabled === 'boolean' ? channel.e2eeEnabled : undefined,
          senderKeyVersion:
            typeof channel?.senderKeyVersion === 'number'
              ? channel.senderKeyVersion
              : undefined,
          createdAt: typeof channel?.createdAt === 'string' ? channel.createdAt : undefined,
          updatedAt: typeof channel?.updatedAt === 'string' ? channel.updatedAt : undefined,
        })

        const memberId = toUserId(data.memberId)

        if (memberId !== undefined && isSameUserId(memberId, userId)) {
          Toast.success('You have been invited to a new group chat')
        }

        try {
          const response = await getChannelMembersApi(channelId)
          const payload = response as ChatChannelMemberDetail[] | {
            data?: ChatChannelMemberDetail[]
          }
          const membersDetail = Array.isArray(payload) ? payload : payload.data ?? []

          ensureConversation(channelId, {
            roomType: 'CHANNEL',
            members: membersDetail.map((member) => member.userId),
            membersDetail,
            membersDetailLoaded: true,
          })
        } catch (error) {
          onError?.(error)
        }
        return
      }
    },
    [
      activeConversation?.hasReq,
      activeConversation?.roomType,
      appendMessages,
      handleIncomingMessages,
      handleNotifyMessage,
      onError,
      pendingJoinRoomIdsRef,
      resolvedActiveConversationId,
      removeChannel,
      removeChannelMember,
      scrollToBottom,
      ensureConversation,
      setContactList,
      setContactRequestList,
      setConversationUnreadCount,
      syncUsersFromRelatedLists,
      updateChannelMemberRole,
      updateConversationMessage,
      upsertUsersFromMessages,
      userId,
    ],
  )

  return {
    handleSocketEvent,
    trackOptimisticMessage,
  }
}
