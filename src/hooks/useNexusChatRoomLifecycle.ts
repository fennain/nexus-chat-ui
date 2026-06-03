import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { flushSync } from 'react-dom'
import { getChannelMembersApi, loadSingleMessagesApi } from '@/api/modules'
import { getConversationPeerUserId } from '@/lib/chatConversation'
import { isSameUserId } from '@/lib/chatUser'
import { useChatSessionsStore } from '@/store/useChatSessionsStore'
import { useChatUsersStore } from '@/store/useChatUsersStore'
import { useScroll } from '@/hooks/useScroll'
import type {
  ContactListItem,
  MessageHistoryItem,
} from '@/api/interface'
import type {
  ChatConnectionStatus,
  ChatChannelItem,
  ChatConversationItem,
  ChatUserId,
} from '@/types'

interface UseNexusChatRoomLifecycleOptions {
  status: ChatConnectionStatus
  activeConversation?: ChatConversationItem | ChatChannelItem
  resolvedActiveConversationId?: string
  userId?: ChatUserId
  pendingJoinRoomIdsRef: MutableRefObject<Set<string>>
  sendPayload: (payload: string | Blob | BufferSource) => void
  onError?: (error: unknown) => void
}

type MessageHistoryResponse = {
  data?: MessageHistoryItem[]
  hasMore?: boolean
}

const normalizeHistoryMessages = (
  messages: MessageHistoryItem[] | undefined,
  roomId: string,
  roomType: 'CONVERSATION' | 'CHANNEL',
) =>
  (messages ? [...messages].reverse() : []).map((item) => ({
    ...item,
    roomId: item.roomId ?? roomId,
    roomType,
  }))

const getSessionById = (conversationId: string) => {
  const { conversations, channels } = useChatSessionsStore.getState()

  return (
    conversations.find((item) => item._id === conversationId) ??
    channels.find((item) => item._id === conversationId)
  )
}

// The rendered list is chronological after reverse; the first item is the
// previous API page's last message and should be used as the next before id.
const getBeforeMessageId = (messages: Array<{ _id?: string }>) =>
  messages.find((item) => item._id)?._id

const restoreScrollPosition = (
  scrollContainer: HTMLElement,
  previousScrollHeight: number,
  previousScrollTop: number,
) => {
  const nextScrollTop =
    previousScrollTop + scrollContainer.scrollHeight - previousScrollHeight

  scrollContainer.scrollTop = nextScrollTop
}

export const canJoinConversation = ({
  activeConversation,
  contactList,
  userId,
}: {
  activeConversation?: ChatConversationItem | ChatChannelItem
  contactList: ContactListItem[]
  userId?: ChatUserId
}) => {
  if (!activeConversation) {
    return false
  }

  if (activeConversation.roomType === 'CHANNEL') {
    return true
  }

  const peerUserId = getConversationPeerUserId(activeConversation, userId)

  return contactList.some((contact) => isSameUserId(contact.targetUserId, peerUserId))
}

export const parseJoinedRoom = (room?: string) => {
  const matchedRoom = room?.match(/^room:(CONVERSATION|CHANNEL):(.+)$/)

  if (!matchedRoom) {
    return undefined
  }

  const [, roomType, roomId] = matchedRoom

  return {
    roomType: roomType === 'CHANNEL' ? 'CHANNEL' : 'CONVERSATION',
    roomId,
  } as const
}

/**
 * 负责当前激活会话的房间生命周期：
 * - 清理未读红点；
 * - 控制 room:join；
 * - 控制历史消息接口的请求时机；
 * - 管理待确认的 room:join 队列。
 */
export function useNexusChatRoomLifecycle({
  status,
  activeConversation,
  resolvedActiveConversationId,
  userId,
  pendingJoinRoomIdsRef,
  sendPayload,
  onError,
}: UseNexusChatRoomLifecycleOptions) {
  const contactList = useChatUsersStore((state) => state.contactList)
  const ensureConversation = useChatSessionsStore((state) => state.ensureConversation)
  const setConversationMessages = useChatSessionsStore((state) => state.setConversationMessages)
  const setConversationUnreadCount = useChatSessionsStore(
    (state) => state.setConversationUnreadCount,
  )
  const setMessagesLoading = useChatSessionsStore((state) => state.setMessagesLoading)
  const { scrollToBottom } = useScroll()
  const loadingPreviousMessagesRef = useRef(false)
  const loadingChannelMemberIdsRef = useRef<Set<string>>(new Set())
  const activeConversationRoomType = activeConversation?.roomType
  const activeChannelMembersDetailLoaded =
    activeConversation && 'members' in activeConversation
      ? activeConversation.membersDetailLoaded
      : undefined

  const activeConversationCanJoin = useMemo(
    () =>
      canJoinConversation({
        activeConversation,
        contactList,
        userId,
      }),
    [activeConversation, contactList, userId],
  )

  useEffect(() => {
    if (status === 'connected') {
      return
    }

    pendingJoinRoomIdsRef.current.clear()
  }, [status])

  useEffect(() => {
    if (
      !resolvedActiveConversationId ||
      !activeConversation?.hasReq ||
      !activeConversation.unreadCount
    ) {
      return
    }

    setConversationUnreadCount(resolvedActiveConversationId, 0)
  }, [
    activeConversation?.hasReq,
    activeConversation?.unreadCount,
    resolvedActiveConversationId,
    setConversationUnreadCount,
  ])

  useEffect(() => {
    if (
      !resolvedActiveConversationId ||
      activeConversationRoomType !== 'CHANNEL' ||
      activeChannelMembersDetailLoaded ||
      loadingChannelMemberIdsRef.current.has(resolvedActiveConversationId)
    ) {
      return
    }

    let cancelled = false
    loadingChannelMemberIdsRef.current.add(resolvedActiveConversationId)

    const loadChannelMembers = async () => {
      try {
        const response = await getChannelMembersApi(resolvedActiveConversationId)
        const payload = response as {
          data?: ChatChannelItem['membersDetail']
        }

        if (cancelled) {
          return
        }

        const membersDetail = payload.data ?? []

        ensureConversation(resolvedActiveConversationId, {
          roomType: 'CHANNEL',
          members: membersDetail.map((item) => item.userId),
          membersDetail,
          membersDetailLoaded: true,
        })
      } catch (error) {
        if (!cancelled) {
          onError?.(error)
        }
      } finally {
        loadingChannelMemberIdsRef.current.delete(resolvedActiveConversationId)
      }
    }

    void loadChannelMembers()

    return () => {
      cancelled = true
    }
  }, [
    activeChannelMembersDetailLoaded,
    activeConversationRoomType,
    ensureConversation,
    onError,
    resolvedActiveConversationId,
  ])


  useEffect(() => {
    if (!resolvedActiveConversationId) {
      return
    }

    const roomType = activeConversation?.roomType ?? 'CONVERSATION'

    if (
      activeConversationCanJoin &&
      !activeConversation?.hasJoin &&
      !pendingJoinRoomIdsRef.current.has(resolvedActiveConversationId)
    ) {
      pendingJoinRoomIdsRef.current.add(resolvedActiveConversationId)
      sendPayload(
        JSON.stringify({
          event: 'room:join',
          data: {
            roomType,
            roomId: resolvedActiveConversationId,
          },
        }),
      )
      return
    }
    if (resolvedActiveConversationId &&
      !activeConversation?.hasJoin) {
      const roomType = activeConversation?.roomType ?? 'CONVERSATION'
      sendPayload(
        JSON.stringify({
          event: 'room:join',
          data: {
            roomType,
            roomId: resolvedActiveConversationId,
          },
        }),
      )
    }
  }, [
    activeConversation?.hasJoin,
    activeConversation?.roomType,
    activeConversationCanJoin,
    resolvedActiveConversationId,
    sendPayload,
  ])

  useEffect(() => {
    if (!resolvedActiveConversationId) {
      scrollToBottom()
      return
    }

    const roomType = activeConversation?.roomType ?? 'CONVERSATION'

    if (activeConversation?.hasReq) {
      console.log('hasReq', activeConversation?.hasReq)

      scrollToBottom()
      return
    }

    let cancelled = false

    const loadHistoryMessages = async () => {
      setMessagesLoading(true)

      try {
        const response = await loadSingleMessagesApi(
          resolvedActiveConversationId,
          roomType,
        )
        const payload = response as MessageHistoryResponse

        if (cancelled) {
          return
        }

        setConversationMessages(
          resolvedActiveConversationId,
          normalizeHistoryMessages(payload.data, resolvedActiveConversationId, roomType),
          payload.hasMore ?? false,
        )
        scrollToBottom()
      } catch (error) {
        if (!cancelled) {
          onError?.(error)
        }
      } finally {
        setMessagesLoading(false)
      }
    }

    void loadHistoryMessages()

    return () => {
      cancelled = true
    }
  }, [
    activeConversation?.hasReq,
    activeConversation?.roomType,
    onError,
    resolvedActiveConversationId,
    scrollToBottom,
    setConversationMessages,
    setMessagesLoading,
  ])

  const loadPreviousHistoryMessages = useCallback(
    async (scrollContainer?: HTMLElement | null) => {
      if (
        !resolvedActiveConversationId ||
        loadingPreviousMessagesRef.current
      ) {
        return
      }

      const currentSession = getSessionById(resolvedActiveConversationId)

      if (!currentSession?.historyHasMore) {
        return
      }

      const before = getBeforeMessageId(currentSession.msg)

      if (!before) {
        return
      }

      const roomType = currentSession.roomType ?? activeConversation?.roomType ?? 'CONVERSATION'
      const previousScrollHeight = scrollContainer?.scrollHeight ?? 0
      const previousScrollTop = scrollContainer?.scrollTop ?? 0

      loadingPreviousMessagesRef.current = true

      try {
        const response = await loadSingleMessagesApi(
          resolvedActiveConversationId,
          roomType,
          before,
        )
        const payload = response as MessageHistoryResponse

        flushSync(() => {
          setConversationMessages(
            resolvedActiveConversationId,
            normalizeHistoryMessages(payload.data, resolvedActiveConversationId, roomType),
            payload.hasMore ?? false,
          )
        })

        if (
          scrollContainer &&
          useChatSessionsStore.getState().activeConversationId === resolvedActiveConversationId
        ) {
          restoreScrollPosition(scrollContainer, previousScrollHeight, previousScrollTop)
        }
      } catch (error) {
        onError?.(error)
      } finally {
        loadingPreviousMessagesRef.current = false
      }
    },
    [
      activeConversation?.roomType,
      onError,
      resolvedActiveConversationId,
      setConversationMessages,
    ],
  )

  return {
    activeConversationCanJoin,
    loadPreviousHistoryMessages,
  }
}
