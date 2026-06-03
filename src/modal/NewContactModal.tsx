import { Avatar, Button, Empty as SemiEmpty, Modal, Toast } from '@douyinfe/semi-ui'
import { useState } from 'react'
import {
  acceptContactRequestApi,
  getContactsApi,
  rejectContactRequestApi,
} from '@/api/modules'
import type { ContactListItem } from '@/api/interface'
import { toUserIdKey } from '@/lib/chatUser'
import CommonModal from '@/components/Modal'
import { useChatUsersStore } from '@/store/useChatUsersStore'
import { DEFAULT_AVATAR } from '@/constants'
import type { ComponentType } from 'react'

interface NewContactModalProps {
  open: boolean
  onCancel: () => void
}

type ContactRequestAction = 'accept' | 'reject'

const Empty = SemiEmpty as unknown as ComponentType<any>

export function NewContactModal({
  open,
  onCancel,
}: NewContactModalProps) {
  const contactRequestList = useChatUsersStore((state) => state.contactRequestList)
  const usersById = useChatUsersStore((state) => state.usersById)
  const removeContactRequest = useChatUsersStore((state) => state.removeContactRequest)
  const setContactList = useChatUsersStore((state) => state.setContactList)
  const [submittingRequestId, setSubmittingRequestId] = useState<string>()

  const handleAction = async (requestId: string, action: ContactRequestAction) => {
    setSubmittingRequestId(requestId)

    try {
      if (action === 'accept') {
        await acceptContactRequestApi(requestId)
        const contactResponse = await getContactsApi()
        const contactPayload = contactResponse as unknown as {
          data?: ContactListItem[]
        }

        setContactList(contactPayload.data ?? [])
        Toast.success('Friend request accepted')
      } else {
        await rejectContactRequestApi(requestId)
        Toast.success('Friend request rejected')
      }

      removeContactRequest(requestId)
    } catch {
      // Toast.error(action === 'accept' ? 'Failed to accept friend request. Please try again later.' : 'Failed to reject friend request. Please try again later.')
    } finally {
      setSubmittingRequestId(undefined)
    }
  }

  const handleOpenActionConfirm = (requestId: string, action: ContactRequestAction) => {
    if (submittingRequestId) {
      return
    }

    const targetRequest = contactRequestList.find((request) => request._id === requestId)
    const targetApplicant = targetRequest
      ? usersById[toUserIdKey(targetRequest.fromUserId)]
      : undefined
    const targetDisplayName = targetApplicant?.userName ?? String(targetRequest?.fromUserId ?? '')

    Modal.confirm({
      title: action === 'accept' ? 'Accept Friend Request' : 'Reject Friend Request',
      content:
        targetRequest
          ? `${action === 'accept' ? 'Accept' : 'Reject'} ${targetDisplayName}'s friend request?`
          : undefined,
      okText: 'Confirm',
      cancelText: 'Cancel',
      okButtonProps: {
        type: action === 'accept' ? 'primary' : 'danger',
      },
      maskClosable: false,
      centered:true,
      onOk: () => handleAction(requestId, action),
    })
  }

  return (
    <CommonModal
      open={open}
      onCancel={onCancel}
      title="New Friends"
      description={`${contactRequestList.length} pending requests`}
      width={640}
    >
      <div className="flex min-h-[360px] flex-col pb-[24px]">
        {contactRequestList.length > 0 ? (
          <div className="flex flex-1 flex-col divide-y divide-slate-100 overflow-hidden rounded-[8px] border border-slate-200 bg-white">
            {contactRequestList.map((request) => {
              const applicant = usersById[toUserIdKey(request.fromUserId)]
              const displayName = applicant?.userName ?? String(request.fromUserId)
              const avatarUrl = applicant?.avatarUrl ?? DEFAULT_AVATAR
              const isSubmitting = submittingRequestId === request._id

              return (
                <div
                  key={request._id}
                  className="flex items-start gap-[12px] px-[16px] py-[14px]"
                >
                  <Avatar size="small" src={avatarUrl}>
                    {displayName.slice(0, 1)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-slate-900">
                      {displayName}
                    </div>
                    <div className="mt-[4px] truncate text-[12px] text-slate-500">
                      {request.fromUserId}
                    </div>
                    <div className="mt-[8px] max-h-[120px] overflow-y-auto rounded-[6px] bg-slate-50 px-[10px] py-[8px] text-[12px] leading-[20px] text-slate-600">
                      {request.message || 'Wants to add you as a friend'}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-[8px]">
                    <Button
                      theme="light"
                      type="danger"
                      disabled={isSubmitting}
                      onClick={() => handleOpenActionConfirm(request._id, 'reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      type="primary"
                      loading={isSubmitting}
                      onClick={() => handleOpenActionConfirm(request._id, 'accept')}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-[8px] border border-dashed border-slate-200">
            <Empty description="No pending friend requests" />
          </div>
        )}
      </div>
    </CommonModal>
  )
}

export default NewContactModal
