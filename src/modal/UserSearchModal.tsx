import { Avatar, Button, Empty as SemiEmpty, Input, Pagination, Spin } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import { searchUsersApi } from '@/api/modules'
import type { UserSearchItem } from '@/api/interface'
import { toUserIdKey } from '@/lib/chatUser'
import CommonModal from '@/components/Modal'
import { DEFAULT_AVATAR } from '@/constants'
import type { ChatUserId } from '@/types'
import type { ComponentType } from 'react'

interface UserSearchModalProps {
  open: boolean
  onCancel: () => void
  onOpenContactRequest?: (payload: {
    userId: ChatUserId
    userName?: string
  }) => void
}

const Empty = SemiEmpty as unknown as ComponentType<any>
const PAGE_SIZE = 8

export function UserSearchModal({
  open,
  onCancel,
  onOpenContactRequest,
}: UserSearchModalProps) {
  // const currentUser = useChatUsersStore((state) => state.currentUser)
  // const allUserList = useChatUsersStore((state) => state.allUserList)
  const [currentPage, setCurrentPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [resultList, setResultList] = useState<UserSearchItem[]>([])

  const trimmedKeyword = useMemo(() => keyword.trim(), [keyword])
  // const initialResultList = useMemo(
  //   () =>
  //     allUserList
  //       .filter((user) => !isSameUserId(user.userId, currentUser?.userId))
  //       .map((user) => ({
  //         userId: user.userId,
  //         userName: user.userName ?? String(user.userId),
  //         avatarUrl: user.avatarUrl ?? '',
  //       })),
  //   [allUserList, currentUser?.userId],
  // )
  const paginatedResultList = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return resultList.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, resultList])

  useEffect(() => {
    if (!open) {
      return
    }

    setCurrentPage(1)
    setKeyword('')
    setHasSearched(false)
    setResultList([])
    setIsSearching(false)
  }, [open])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(resultList.length / PAGE_SIZE))

    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
    }
  }, [currentPage, resultList.length])

  const handleSearch = async () => {
    if (!trimmedKeyword || isSearching) {
      return
    }

    setIsSearching(true)

    try {
      const response = await searchUsersApi(trimmedKeyword)
      const payload = response as UserSearchItem[] | { data?: UserSearchItem[] }
      const nextResultList = Array.isArray(payload) ? payload : (payload.data ?? [])
      setCurrentPage(1)
      setResultList(nextResultList)
      setHasSearched(true)
    } catch {
      setHasSearched(true)
      setResultList([])

      // const errorMessage =
      //   error instanceof Error ? error.message : 'Search failed. Please try again later.'
      // Toast.error(errorMessage)
    } finally {
      setIsSearching(false)
    }
  }

  const handleOpenRequestModal = (user: UserSearchItem) => {
    onOpenContactRequest?.({
      userId: user.userId,
      userName: user.userName,
    })
  }

  return (
    <CommonModal
      open={open}
      onCancel={onCancel}
      title="Search Users"
      description="Enter a nickname or user ID to search."
      width={720}
    >
      <div className="flex min-h-[420px] flex-col gap-[20px] pb-[24px]">
        <div className="flex items-center gap-[12px]">
          <Input
            value={keyword}
            placeholder="Enter nickname or user ID"
            showClear
            size="large"
            onChange={(value) => setKeyword(value)}
            onEnterPress={handleSearch}
          />
          <Button
            theme="solid"
            type="primary"
            size="large"
            loading={isSearching}
            disabled={!trimmedKeyword}
            onClick={() => void handleSearch()}
          >
            Search
          </Button>
        </div>

        {isSearching ? (
          <div className="flex flex-1 items-center justify-center rounded-[8px] border border-dashed border-slate-200">
            <Spin size="large" />
          </div>
        ) : resultList.length > 0 ? (
          <div className="flex flex-1 flex-col divide-y divide-slate-100 overflow-hidden rounded-[8px] border border-slate-200 bg-white">
            {paginatedResultList.map((user) => (
              <div
                key={toUserIdKey(user.userId)}
                className="flex items-center gap-[12px] px-[16px] py-[6px]"
              >
                <Avatar size="medium" src={user.avatarUrl || DEFAULT_AVATAR}>
                  {user.userName?.slice(0, 1) || String(user.userId).slice(0, 1)}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-slate-900">
                    {user.userName}
                  </div>
                  <div className="truncate text-[12px] text-slate-500">
                    {user.userId}
                  </div>
                </div>
                <Button
                  theme="outline"
                  type="tertiary"
                  onClick={() => handleOpenRequestModal(user)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="flex flex-1 items-center justify-center rounded-[8px] border border-dashed border-slate-200">
            <Empty description="No users found" />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-[8px] border border-dashed border-slate-200 bg-[#fafafa] text-[14px] text-slate-400">
            Enter a search term, then click Search.
          </div>
        )}
        <div className="flex justify-end">
          <Pagination
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            total={resultList.length}
            onPageChange={setCurrentPage}
            hideOnSinglePage
            showSizeChanger={false}
          />
        </div>
      </div>
    </CommonModal>
  )
}

export default UserSearchModal
