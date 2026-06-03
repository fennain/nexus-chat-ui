import { create } from 'zustand'
import type { ContactListItem, ContactRequestItem, ContactStatus } from '@/api/interface'
import { hasUserId, toUserIdKey } from '@/lib/chatUser'
import type { ChatMessageItem, ChatUserProfile, ChatUserId } from '@/types'

interface ChatUsersStore {
  currentUser?: ChatUserProfile
  allUserList: ChatUserProfile[]
  contactList: ContactListItem[]
  contactRequestList: ContactRequestItem[]
  usersById: Record<string, ChatUserProfile>
  setAllUserList: (users: ChatUserProfile[]) => void
  setContactList: (contacts: ContactListItem[]) => void
  setContactRequestList: (requests: ContactRequestItem[]) => void
  removeContactRequest: (requestId: string) => void
  updateContactStatus: (targetUserId: ChatUserId, status: ContactStatus) => void
  setCurrentUser: (user?: ChatUserProfile) => void
  upsertUsersFromMessages: (messages: ChatMessageItem[]) => void
}

const toProfile = (message: ChatMessageItem): ChatUserProfile | undefined => {
  const userId = message.senderId

  if (!hasUserId(userId)) {
    return undefined
  }

  return {
    userId,
  }
}

const mergeProfileFields = (
  current: ChatUserProfile | undefined,
  incoming: ChatUserProfile,
): ChatUserProfile => ({
  userId: hasUserId(incoming.userId) ? incoming.userId : (current?.userId ?? ''),
  ...(current?.userName !== undefined ? { userName: current.userName } : {}),
  ...(current?.avatarUrl !== undefined ? { avatarUrl: current.avatarUrl } : {}),
  ...(current?.token !== undefined ? { token: current.token } : {}),
  ...(incoming.userName !== undefined ? { userName: incoming.userName } : {}),
  ...(incoming.avatarUrl !== undefined ? { avatarUrl: incoming.avatarUrl } : {}),
  ...(incoming.token !== undefined ? { token: incoming.token } : {}),
})

const normalizeUsers = (users: ChatUserProfile[]) => {
  const nextUsersById: Record<string, ChatUserProfile> = {}

  users.forEach((user) => {
    if (!hasUserId(user.userId)) {
      return
    }

    const userIdKey = toUserIdKey(user.userId)
    nextUsersById[userIdKey] = mergeProfileFields(nextUsersById[userIdKey], user)
  })

  return Object.values(nextUsersById)
}

const buildUsersById = (users: ChatUserProfile[]) =>
  users.reduce<Record<string, ChatUserProfile>>((acc, user) => {
    const userIdKey = toUserIdKey(user.userId)

    if (userIdKey) {
      acc[userIdKey] = user
    }

    return acc
  }, {})

const mergeUsers = (existing: ChatUserProfile[], updates: ChatUserProfile[]) => {
  const nextUsersById = buildUsersById(existing)

  updates.forEach((user) => {
    if (!hasUserId(user.userId)) {
      return
    }

    const userIdKey = toUserIdKey(user.userId)
    nextUsersById[userIdKey] = mergeProfileFields(nextUsersById[userIdKey], user)
  })

  return Object.values(nextUsersById)
}

export const useChatUsersStore = create<ChatUsersStore>((set) => ({
  currentUser: undefined,
  allUserList: [],
  contactList: [],
  contactRequestList: [],
  usersById: {},
  setAllUserList: (users) =>
    set((state) => {
      const normalizedUsers = normalizeUsers(users)
      const nextAllUserList = hasUserId(state.currentUser?.userId)
        ? mergeUsers(normalizedUsers, [state.currentUser])
        : normalizedUsers

      return {
        allUserList: nextAllUserList,
        usersById: buildUsersById(nextAllUserList),
      }
    }),
  setContactList: (contactList) => set({ contactList }),
  setContactRequestList: (contactRequestList) => set({ contactRequestList }),
  removeContactRequest: (requestId) =>
    set((state) => ({
      contactRequestList: state.contactRequestList.filter((item) => item._id !== requestId),
    })),
  updateContactStatus: (targetUserId, status) =>
    set((state) => ({
      contactList: state.contactList.map((item) =>
        item.targetUserId === targetUserId ? { ...item, status } : item,
      ),
    })),
  setCurrentUser: (currentUser) =>
    set((state) => {
      if (!hasUserId(currentUser?.userId)) {
        return { currentUser: undefined }
      }

      const nextAllUserList = mergeUsers(state.allUserList, [currentUser])

      return {
        currentUser,
        allUserList: nextAllUserList,
        usersById: buildUsersById(nextAllUserList),
      }
    }),
  upsertUsersFromMessages: (messages) =>
    set((state) => {
      const updates = messages
        .map(toProfile)
        .filter((item): item is ChatUserProfile => Boolean(item))

      if (updates.length === 0) {
        return {}
      }

      const nextAllUserList = mergeUsers(state.allUserList, updates)

      return {
        allUserList: nextAllUserList,
        usersById: buildUsersById(nextAllUserList),
      }
    }),
}))
