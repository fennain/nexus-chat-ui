import { Button, Form, Toast } from '@douyinfe/semi-ui'
import { useState } from 'react'
import { createChannelApi } from '@/api/modules'
import CommonModal from '@/components/Modal'
import type { ChannelListItem } from '@/api/interface'
import { useChatSessionsStore } from '@/store/useChatSessionsStore'
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form'

interface CreateChannelModalProps {
  open: boolean
  onCancel: () => void
}

interface CreateChannelFormValues {
  name: string
  description: string
}

export function CreateChannelModal({
  open,
  onCancel,
}: CreateChannelModalProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [formApi, setFormApi] = useState<FormApi<CreateChannelFormValues>>()
  const prependChannel = useChatSessionsStore((state) => state.prependChannel)
  const setActiveConversationId = useChatSessionsStore(
    (state) => state.setActiveConversationId,
  )
  const setTabbarValue = useChatSessionsStore((state) => state.setTabbarValue)

  const handleCreateChannel = async ({
    name,
    description,
  }: CreateChannelFormValues) => {
    setIsCreating(true)

    try {
      const response = await createChannelApi(name, description)
      const payload = response as ChannelListItem | { data?: ChannelListItem }
      const nextChannel = '_id' in payload ? payload : payload.data

      if (!nextChannel?._id) {
        Toast.error('Failed to create group chat')
        return
      }

      prependChannel({
        _id: nextChannel._id,
        members: nextChannel.members ?? [],
        name: nextChannel.name ?? name,
        description: nextChannel.description ?? description,
        type: nextChannel.type ?? 'CHANNEL',
        createdBy: nextChannel.createdBy ?? '',
        e2eeEnabled: nextChannel.e2eeEnabled ?? false,
        senderKeyVersion: nextChannel.senderKeyVersion ?? 0,
        createdAt: nextChannel.createdAt ?? new Date().toISOString(),
        updatedAt: nextChannel.updatedAt ?? new Date().toISOString(),
        membersDetail: nextChannel.membersDetail ?? [],
        membersDetailLoaded: Boolean(nextChannel.membersDetail?.length),
        roomType: 'CHANNEL',
        msg: [],
      })
      setTabbarValue('contacts')
      setActiveConversationId(nextChannel._id)
      onCancel()
    } catch {
      // Toast.error('Failed to create group chat. Please try again later.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <CommonModal
      open={open}
      onCancel={onCancel}
      title="Create Group Chat"
      description="Enter a group name and description to create a group chat."
      width={520}
      footer={
        <>
          <Button theme="light" onClick={onCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={isCreating}
            onClick={() => formApi?.submitForm()}
          >
            Create Group Chat
          </Button>
        </>
      }
    >
      <Form<CreateChannelFormValues>
        layout="vertical"
        getFormApi={setFormApi}
        onSubmit={handleCreateChannel}
      >
        <div className="flex flex-col gap-[16px]">
          <Form.Input
            field="name"
            label="Group Name"
            placeholder="Enter group name"
            disabled={isCreating}
            rules={[{ required: true, message: 'Please enter a group name' }]}
          />
          <Form.TextArea
            field="description"
            label="Group Description"
            placeholder="Enter group description"
            disabled={isCreating}
            rows={4}
            rules={[{ required: true, message: 'Please enter a group description' }]}
          />
        </div>
      </Form>
    </CommonModal>
  )
}

export default CreateChannelModal
