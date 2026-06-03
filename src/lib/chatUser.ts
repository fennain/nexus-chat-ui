import type { ChatUserId } from '@/types'

export const hasUserId = (
  value: ChatUserId | null | undefined,
): value is ChatUserId => value !== undefined && value !== null && String(value).trim() !== ''

export const toUserIdKey = (value: ChatUserId | null | undefined) =>
  hasUserId(value) ? String(value) : ''

export const isSameUserId = (
  left?: ChatUserId | null,
  right?: ChatUserId | null,
) => hasUserId(left) && hasUserId(right) && toUserIdKey(left) === toUserIdKey(right)
