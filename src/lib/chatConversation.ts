import type { ContactListItem, ConversationListItem } from '@/api/interface'
import { isSameUserId, toUserIdKey } from '@/lib/chatUser'
import type { ChatConversationItem, ChatUserId, ChatUserProfile } from '@/types'

export const getUserDisplayProfile = ({
  userId,
  alias,
  allUsers,
}: {
  userId?: ChatUserId
  alias?: string
  allUsers: ChatUserProfile[]
}) => {
  const user = allUsers.find((item) => isSameUserId(item.userId, userId))
  const trimmedAlias = alias?.trim()
  const userName = user?.userName?.trim()

  return {
    displayName: trimmedAlias
      ? userName
        ? `${trimmedAlias}（${userName}）`
        : trimmedAlias
      : userName ?? toUserIdKey(userId),
    avatarUrl: user?.avatarUrl,
  }
}

export const getConversationPeerUserId = (
  conversation: ChatConversationItem,
  currentUserId?: ChatUserId,
) =>
  conversation.participants.find((participantId) => !isSameUserId(participantId, currentUserId)) ??
  conversation.participants[0] ??
  conversation._id

export const findConversationByUserId = ({
  conversations,
  userId,
}: {
  conversations: ChatConversationItem[]
  userId: ChatUserId
}) => conversations.find((conversation) =>
  conversation.participants.some((participantId) => isSameUserId(participantId, userId)),
)

export const toChatConversationItem = ({
  conversation,
  currentUserId,
  targetUserId,
}: {
  conversation: ConversationListItem
  currentUserId?: ChatUserId
  targetUserId: ChatUserId
}): ChatConversationItem => ({
  _id: conversation._id,
  participants:
    conversation.participants ??
    [currentUserId, targetUserId].filter(
      (participant): participant is ChatUserId => participant !== undefined && participant !== null,
    ),
  createdAt: conversation.createdAt ?? new Date().toISOString(),
  updatedAt: conversation.updatedAt ?? new Date().toISOString(),
  msg: [],
  roomType: 'CONVERSATION',
})

export const getConversationDisplayProfile = ({
  conversation,
  allUsers,
  contacts,
  currentUserId,
}: {
  conversation: ChatConversationItem
  allUsers: ChatUserProfile[]
  contacts?: ContactListItem[]
  currentUserId?: ChatUserId
}) => {
  const peerUserId = getConversationPeerUserId(conversation, currentUserId)
  const matchedContact = contacts?.find((contact) =>
    isSameUserId(contact.targetUserId, peerUserId),
  )
  const { displayName, avatarUrl } = getUserDisplayProfile({
    userId: peerUserId,
    alias: matchedContact?.alias,
    allUsers,
  })

  return {
    peerUserId,
    displayName: displayName || conversation._id,
    avatarUrl,
    info: toUserIdKey(peerUserId) === conversation._id
      ? `${conversation.msg.length} messages`
      : toUserIdKey(peerUserId),
  }
}
