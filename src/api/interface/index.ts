import type {
  ChatAttachmentItem,
  ChatChannelMemberDetail,
  ChatMessageEncryption,
  ChatUserId,
} from '@/types'

// Request response parameters (excluding data)

// paging request parameters
export interface ReqPage {
  current?: number;
  pageSize?: number;
}

// paging response parameters
export interface ResPage<T> {
  list: T[];
  current: number;
  pageSize: number;
  total: number;
}

export interface ConversationListItem {
  _id: string;
  participants: ChatUserId[];
  createdAt: string;
  updatedAt: string;
}

export interface ChannelListItem {
  _id: string
  members: ChatUserId[]
  membersDetail?: ChatChannelMemberDetail[]
  name: string
  description?: string
  type: string
  createdBy: ChatUserId
  e2eeEnabled: boolean
  senderKeyVersion: number
  createdAt: string;
  updatedAt: string;
}

export interface MessageHistoryItem {
  _id: string;
  roomType: 'CONVERSATION' | 'CHANNEL';
  roomId: string;
  senderId: ChatUserId;
  type: string;
  status: string;
  encryption: ChatMessageEncryption;
  attachment?: ChatAttachmentItem;
  sentAt: string;
}

export type ContactStatus = 'ACTIVE' | 'BLOCKED' | 'DELETED'

export interface ContactListItem {
  _id: string
  ownerId: ChatUserId
  targetUserId: ChatUserId
  alias: string
  remark: string
  tags: string[]
  status: ContactStatus
  createdAt: string
  updatedAt: string
}

export interface UpdateContactPayload {
  alias?: string
  remark?: string
  tags?: string[]
}

export interface UserSearchItem {
  userId: ChatUserId
  userName: string
  avatarUrl: string
}

export type ContactRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface ContactRequestItem {
  _id: string
  fromUserId: ChatUserId
  toUserId: ChatUserId
  message: string
  status: ContactRequestStatus
  createdAt: string
  updatedAt: string
}

export interface ContactRequestActionResult {
  ok: boolean
}

export interface ContactActionResult {
  ok: boolean
}
