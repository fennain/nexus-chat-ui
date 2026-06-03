import type { ChatConnectionContext, ChatConversationItem, ChatMessageItem, ChatUserId } from '@/types'

const normalizeRoomType = (roomType?: string): ChatConversationItem['roomType'] =>
  roomType === 'CHANNEL' ? 'CHANNEL' : 'CONVERSATION'

export const buildConnectionUrl = (
  wsUrl: string,
  context: ChatConnectionContext,
) => {
  try {
    const url = new URL(wsUrl)

    if (context.token) {
      url.searchParams.set('token', context.token)
    }

    Object.entries(context.connectionParams ?? {}).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })

    return url.toString()
  } catch {
    return wsUrl
  }
}

export const createOutgoingPayload = (
  message: ChatMessageItem,
) => {
  return JSON.stringify({
    event: 'message:send',
    data: {
      roomType: normalizeRoomType(message.roomType),
      roomId: message.roomId,
      type: message.type ?? 'TEXT',
      ciphertext: message.encryption?.text ?? '',
    },
  })
}

export const createLocalMessage = (
  message: string,
  conversationId?: string,
  senderId?: ChatUserId,
  roomType: ChatConversationItem['roomType'] = 'CONVERSATION',
): ChatMessageItem => ({
  _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  roomId: conversationId,
  roomType,
  senderId,
  type: 'TEXT',
  status: 'sending',
  encryption: {
    scheme: 'NONE',
    text: message,
  },
  sentAt: new Date().toISOString(),
})
