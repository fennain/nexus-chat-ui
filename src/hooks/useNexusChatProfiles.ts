import { useCallback, useEffect } from 'react'
import { getUsersByIdsApi } from '@/api/modules'
import { hasUserId, toUserIdKey } from '@/lib/chatUser'
import { useChatUsersStore } from '@/store/useChatUsersStore'
import type {
  ChannelListItem,
  ContactListItem,
  ContactRequestItem,
  ConversationListItem,
} from '@/api/interface'
import type { ChatUserId, ChatUserProfile } from '@/types'

export interface SyncUsersFromRelatedListsArgs {
  conversations: ConversationListItem[]
  channels: ChannelListItem[]
  contacts: ContactListItem[]
  contactRequests: ContactRequestItem[]
}

interface UseNexusChatProfilesOptions {
  userId?: ChatUserId
}

export const collectRelatedUserIds = ({
  userId,
  conversations,
  channels,
  contacts,
  contactRequests,
}: {
  userId?: ChatUserId
  conversations: ConversationListItem[]
  channels: ChannelListItem[]
  contacts: ContactListItem[]
  contactRequests: ContactRequestItem[]
}) => {
  const userIds = new Map<string, ChatUserId>()

  const addUserId = (value?: ChatUserId) => {
    if (hasUserId(value)) {
      userIds.set(toUserIdKey(value), value)
    }
  }

  addUserId(userId)
  conversations.forEach((conversation) => {
    conversation.participants.forEach(addUserId)
  })
  channels.forEach((channel) => {
    channel.members.forEach(addUserId)
    addUserId(channel.createdBy)
  })
  contacts.forEach((contact) => {
    addUserId(contact.targetUserId)
    addUserId(contact.ownerId)
  })
  contactRequests.forEach((request) => {
    addUserId(request.fromUserId)
    addUserId(request.toUserId)
  })

  return [...userIds.values()]
}

export const normalizeUserIdsForRequest = (userIds: ChatUserId[]) =>
  userIds.map((value) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number.parseInt(value, 10) : value,
  )

export const getMissingUserIds = (
  relatedUserIds: ChatUserId[],
  allUserList: ChatUserProfile[],
) => {
  const existingUserIdKeys = new Set(allUserList.map((item) => toUserIdKey(item.userId)))

  return relatedUserIds.filter(
    (relatedUserId) => !existingUserIdKeys.has(toUserIdKey(relatedUserId)),
  )
}

const hasResolvedUserProfile = (user?: ChatUserProfile) =>
  Boolean(user?.userName?.trim() || user?.avatarUrl?.trim())

const appendUserIdIfMissing = (userIds: ChatUserId[], userId?: ChatUserId) => {
  if (!hasUserId(userId)) {
    return userIds
  }

  const userIdKey = toUserIdKey(userId)

  if (userIds.some((item) => toUserIdKey(item) === userIdKey)) {
    return userIds
  }

  return [...userIds, userId]
}

/**
 * 负责用户资料同步：
 * 1. 同步当前用户资料到 store；
 * 2. 基于会话/群聊/好友/申请列表补齐缺失的用户资料。
 */
export function useNexusChatProfiles({
  userId,
}: UseNexusChatProfilesOptions) {
  const allUserList = useChatUsersStore((state) => state.allUserList)
  const setAllUserList = useChatUsersStore((state) => state.setAllUserList)
  const setCurrentUser = useChatUsersStore((state) => state.setCurrentUser)
  const matchedCurrentUser = allUserList.find((item) =>
    hasUserId(userId) ? String(item.userId) === String(userId) : false,
  )

  const syncUsersFromRelatedLists = useCallback(
    async ({
      conversations,
      channels,
      contacts,
      contactRequests,
    }: SyncUsersFromRelatedListsArgs) => {
      const { allUserList: latestAllUserList } = useChatUsersStore.getState()
      const relatedUserIds = collectRelatedUserIds({
        userId,
        conversations,
        channels,
        contacts,
        contactRequests,
      })
      const missingUserIds = getMissingUserIds(relatedUserIds, latestAllUserList)
      const currentUserProfile = latestAllUserList.find(
        (item) => toUserIdKey(item.userId) === toUserIdKey(userId),
      )
      const userIdsToFetch = hasResolvedUserProfile(currentUserProfile)
        ? missingUserIds
        : appendUserIdIfMissing(missingUserIds, userId)

      if (userIdsToFetch.length === 0) {
        return
      }

      const fetchedUsers = await getUsersByIdsApi(
        normalizeUserIdsForRequest(userIdsToFetch),
      )

      setAllUserList([...latestAllUserList, ...fetchedUsers])
    },
    [setAllUserList, userId],
  )

  useEffect(() => {
    if (!hasUserId(userId)) {
      return
    }

    setCurrentUser({
      userId,
      ...(matchedCurrentUser?.userName !== undefined
        ? { userName: matchedCurrentUser.userName }
        : {}),
      ...(matchedCurrentUser?.avatarUrl !== undefined
        ? { avatarUrl: matchedCurrentUser.avatarUrl }
        : {}),
    })
  }, [matchedCurrentUser?.avatarUrl, matchedCurrentUser?.userName, setCurrentUser, userId])

  return {
    syncUsersFromRelatedLists,
  }
}
