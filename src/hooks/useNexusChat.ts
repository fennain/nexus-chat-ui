import {
  getChannelsApi,
  getContactsApi,
  getContactRequestsApi,
  getConversationsApi,
} from '@/api/modules'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLocalMessage } from '@/lib/chatProtocol'
import { hasUserId } from '@/lib/chatUser'
import { useChatSessionsStore } from '@/store/useChatSessionsStore'
import { useChatUsersStore } from '@/store/useChatUsersStore'
import { useChatConnection } from '@/hooks/useChatConnection'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useNexusChatConnectionConfig } from '@/hooks/useNexusChatConnectionConfig'
import { useNexusChatEventHandlers } from '@/hooks/useNexusChatEventHandlers'
import { useNexusChatRoomLifecycle } from '@/hooks/useNexusChatRoomLifecycle'
import { useNexusChatProfiles } from '@/hooks/useNexusChatProfiles'
import type {
  ChatConnectionContext,
  ChatConnectionStatus,
  ChatConversationItem,
  ChatMessageItem,
  ChatUserProfile,
} from '@/types'
import type {
  ChannelListItem,
  ContactListItem,
  ContactRequestItem,
  ConversationListItem,
} from '@/api/interface'
import type { NexusChatUIProps } from '@/types'

type UseNexusChatOptions = Pick<
  NexusChatUIProps,
  | 'autoConnect'
  | 'connectionParams'
  | 'disabled'
  | 'emptyMessageText'
  | 'onConnectionStatusChange'
  | 'onError'
  | 'onMessageReceive'
  | 'wsUrl'
  | 'httpUrl'
  | 'searchUrl'
  | 'getUserUrl'
  | 'token'
  | 'userId'
>

export interface UseNexusChatResult {
  activeConversationId?: string
  conversations: ChatConversationItem[]
  connectionStatus: ChatConnectionStatus
  hasReconnectExhausted: boolean
  inputValue: string
  isMessagesLoading: boolean
  messages: ChatMessageItem[]
  resolvedDisabled: boolean
  handleChange: (innerHtml: string, textContent: string, innerText: string) => void
  handleReconnect: () => void
  handleSend: (innerHtml: string, textContent: string, innerText: string) => void
  handleLoadPreviousMessages: (scrollContainer?: HTMLElement | null) => Promise<void>
}

export function useNexusChat({
  autoConnect = true,
  connectionParams,
  disabled = false,
  onConnectionStatusChange,
  onError,
  onMessageReceive,
  wsUrl,
  httpUrl,
  searchUrl,
  getUserUrl,
  token,
  userId,
}: UseNexusChatOptions): UseNexusChatResult {
  const [inputValue, setInputValue] = useState('')
  const hasToken = Boolean(token.trim())
  const allUserList = useChatUsersStore((state) => state.allUserList)
  const setContactList = useChatUsersStore((state) => state.setContactList)
  const setContactRequestList = useChatUsersStore((state) => state.setContactRequestList)
  const setConversations = useChatSessionsStore((state) => state.setConversations)
  const setChannels = useChatSessionsStore((state) => state.setChannels)
  const setConversationsLoading = useChatSessionsStore((state) => state.setConversationsLoading)
  const isMessagesLoading = useChatSessionsStore((state) => state.isMessagesLoading)
  const pendingJoinRoomIdsRef = useRef<Set<string>>(new Set())

  const {
    activeConversationId: resolvedActiveConversationId,
    appendMessages,
    channels,
    conversations,
    messages,
  } = useChatMessages({
    onMessageReceive,
  })

  const matchedCurrentUser = useMemo<ChatUserProfile | undefined>(
    () =>
      allUserList.find((item) =>
        hasUserId(userId) ? String(item.userId) === String(userId) : false,
      ),
    [allUserList, userId],
  )
  const activeConversation = useMemo(
    () =>
      [...conversations, ...channels].find(
        (item) => item._id === resolvedActiveConversationId,
      ),
    [channels, conversations, resolvedActiveConversationId],
  )

  const resolvedUserName = matchedCurrentUser?.userName ?? 'You'
  const resolvedUserAvatar = matchedCurrentUser?.avatarUrl

  const context = useMemo<ChatConnectionContext>(
    () => ({
      userId,
      userName: resolvedUserName,
      userAvatar: resolvedUserAvatar,
      token,
      connectionParams,
    }),
    [connectionParams, resolvedUserAvatar, resolvedUserName, token, userId],
  )

  const { syncUsersFromRelatedLists } = useNexusChatProfiles({
    userId,
  })

  useNexusChatConnectionConfig({
    httpUrl,
    searchUrl,
    getUserUrl,
    token,
  })

  const {
    handleSocketEvent,
    trackOptimisticMessage,
  } = useNexusChatEventHandlers({
    userId,
    activeConversation,
    resolvedActiveConversationId,
    pendingJoinRoomIdsRef,
    syncUsersFromRelatedLists,
    onMessageReceive,
    onError,
  })

  const {
    resolvedWsUrl,
    sendMessage,
    sendPayload,
    status,
    reconnect,
    hasReconnectExhausted,
  } = useChatConnection({
    autoConnect: autoConnect && hasToken,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 3,
    wsUrl,
    context,
    onConnectionStatusChange,
    onError,
    onEvent: handleSocketEvent,
  })

  const { loadPreviousHistoryMessages } = useNexusChatRoomLifecycle({
    status,
    activeConversation,
    resolvedActiveConversationId,
    userId,
    pendingJoinRoomIdsRef,
    sendPayload,
    onError,
  })

  useEffect(() => {
    if (status !== 'connected' || !hasToken) {
      return
    }

    let cancelled = false

    const loadConversations = async () => {
      setConversationsLoading(true)

      try {
        const [
          conversationsResponse,
          channelsResponse,
          contactsResponse,
          contactRequestsResponse,
        ] = await Promise.all([
          getConversationsApi(),
          getChannelsApi(),
          getContactsApi(),
          getContactRequestsApi(),
        ])

        const conversationPayload = conversationsResponse as {
          data?: ConversationListItem[]
        }
        const channelPayload = channelsResponse as {
          data?: ChannelListItem[]
        }
        const contactPayload = contactsResponse as {
          data?: ContactListItem[]
        }
        const contactRequestPayload = contactRequestsResponse as {
          data?: ContactRequestItem[]
        }
        const conversationList = conversationPayload.data ?? []
        const channelList = channelPayload.data ?? []
        const contactList = contactPayload.data ?? []
        const contactRequestList = contactRequestPayload.data ?? []

        if (cancelled) {
          return
        }

        setConversations(
          conversationList.map((conversation) => ({
            ...conversation,
            roomType: 'CONVERSATION',
            msg: [],
          })),
        )
        setChannels(
          channelList.map((channel) => ({
            ...channel,
            membersDetail: channel.membersDetail ?? [],
            membersDetailLoaded: Boolean(channel.membersDetail?.length),
            roomType: 'CHANNEL',
            msg: [],
          })),
        )
        setContactList(contactList)
        setContactRequestList(contactRequestList)

        await syncUsersFromRelatedLists({
          conversations: conversationList,
          channels: channelList,
          contacts: contactList,
          contactRequests: contactRequestList,
        })
      } catch (error) {
        if (!cancelled) {
          onError?.(error)
        }
      } finally {
        if (!cancelled) {
          setConversationsLoading(false)
        }
      }
    }

    void loadConversations()

    return () => {
      cancelled = true
    }
  }, [
    onError,
    setChannels,
    setContactList,
    setContactRequestList,
    setConversations,
    setConversationsLoading,
    hasToken,
    status,
    syncUsersFromRelatedLists,
  ])

  const resolvedDisabled = disabled || !hasToken || !resolvedWsUrl || !resolvedActiveConversationId

  const handleChange = useCallback(
    (innerHtml: string, textContent: string, innerText: string) => {
      setInputValue(textContent || innerText || innerHtml)
    },
    [],
  )

  const handleSend = useCallback(
    (innerHtml: string, textContent: string, innerText: string) => {
      const nextValue = (textContent || innerText || innerHtml).trim()

      if (!nextValue) {
        return
      }

      if (!resolvedActiveConversationId) {
        return
      }

      const nextMessage = createLocalMessage(
        nextValue,
        resolvedActiveConversationId,
        userId,
        activeConversation?.roomType ?? 'CONVERSATION',
      )

      appendMessages([nextMessage], resolvedActiveConversationId)

      if (nextMessage._id) {
        trackOptimisticMessage(nextMessage._id, resolvedActiveConversationId)
      }

      sendMessage(nextMessage)

      setInputValue('')
      // scrollToBottom()
    },
    [
      activeConversation?.roomType,
      appendMessages,
      resolvedActiveConversationId,
      sendMessage,
      trackOptimisticMessage,
      userId,
    ],
  )

  return {
    conversations,
    activeConversationId: resolvedActiveConversationId,
    connectionStatus: status,
    hasReconnectExhausted,
    inputValue,
    isMessagesLoading,
    messages,
    resolvedDisabled,
    handleChange,
    handleReconnect: reconnect,
    handleSend,
    handleLoadPreviousMessages: loadPreviousHistoryMessages,
  }
}
