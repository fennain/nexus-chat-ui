import { useCallback, useMemo } from 'react'
import { useChatSessionsStore } from '@/store/useChatSessionsStore'
import type { ChatConversationItem, ChatChannelItem, ChatMessageItem } from '@/types'

interface UseChatMessagesOptions {
  onMessageReceive?: (message: ChatMessageItem) => void
}

interface UseChatMessagesResult {
  conversations: ChatConversationItem[]
  channels: ChatChannelItem[]
  activeConversationId?: string
  messages: ChatMessageItem[]
  appendMessages: (incomingMessages: ChatMessageItem[], conversationId?: string) => void
}

export function useChatMessages({
  onMessageReceive,
}: UseChatMessagesOptions): UseChatMessagesResult {
  const conversations = useChatSessionsStore((state) => state.conversations)
  const channels = useChatSessionsStore((state) => state.channels)
  const activeConversationIdFromStore = useChatSessionsStore((state) => state.activeConversationId)
  const ensureConversation = useChatSessionsStore((state) => state.ensureConversation)
  const appendMessagesToConversation = useChatSessionsStore((state) => state.appendMessages)

  const appendMessages = useCallback(
    (incomingMessages: ChatMessageItem[], conversationId?: string) => {
      const targetConversationId =
        conversationId ?? incomingMessages[0]?.roomId ?? activeConversationIdFromStore

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
      activeConversationIdFromStore,
      appendMessagesToConversation,
      ensureConversation,
      onMessageReceive,
    ],
  )

  const activeConversation = useMemo(
    () =>
      [...conversations, ...channels].find(
        (item) => item._id === activeConversationIdFromStore,
      ),
    [activeConversationIdFromStore, channels, conversations],
  )

  return {
    conversations,
    channels,
    activeConversationId: activeConversation?._id,
    messages: activeConversation?.msg ?? [],
    appendMessages,
  }
}
