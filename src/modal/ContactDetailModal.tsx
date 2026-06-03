import {
  Avatar,
  Button,
  Input,
  Modal,
  Switch,
  TagInput,
  TextArea,
  Toast,
} from "@douyinfe/semi-ui";
import { useEffect, useMemo, useState } from "react";
import {
  blockContactApi,
  deleteContactApi,
  unblockContactApi,
  updateContactApi,
} from "@/api/modules";
import type { ContactListItem, ContactStatus } from "@/api/interface";
import { isSameUserId } from "@/lib/chatUser";
import CommonModal from "@/components/Modal";
import { getUserDisplayProfile } from "@/lib/chatConversation";
import { useChatUsersStore } from "@/store/useChatUsersStore";
import { DEFAULT_AVATAR } from "@/constants";
import type { ChatUserId } from "@/types";

interface ContactDetailModalProps {
  open: boolean;
  contactTargetUserId?: ChatUserId;
  onCancel: () => void;
  onSendMessage: (targetUserId: ChatUserId) => Promise<void>;
}

export function ContactDetailModal({
  open,
  contactTargetUserId,
  onCancel,
  onSendMessage,
}: ContactDetailModalProps) {
  const allUserList = useChatUsersStore((state) => state.allUserList);
  const contactList = useChatUsersStore((state) => state.contactList);
  const setContactList = useChatUsersStore((state) => state.setContactList);
  const updateContactStatus = useChatUsersStore((state) => state.updateContactStatus);
  const [alias, setAlias] = useState("");
  const [remark, setRemark] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingBlocked, setIsTogglingBlocked] = useState(false);

  const contact = useMemo(
    () =>
      contactTargetUserId !== undefined
        ? contactList.find((item) => isSameUserId(item.targetUserId, contactTargetUserId))
        : undefined,
    [contactList, contactTargetUserId],
  );

  useEffect(() => {
    if (!open || !contact) {
      return;
    }

    setAlias(contact.alias ?? "");
    setRemark(contact.remark ?? "");
    setTags(contact.tags ?? []);
  }, [contact, open]);

  const { displayName, avatarUrl } = useMemo(
    () =>
      getUserDisplayProfile({
        userId: contact?.targetUserId,
        alias: contact?.alias,
        allUsers: allUserList,
      }),
    [allUserList, contact?.alias, contact?.targetUserId],
  );
  const isBlocked = contact?.status === "BLOCKED";
  const isBusy = isSaving || isDeleting || isSending || isTogglingBlocked;

  const handleSave = async () => {
    if (!contact || isBusy) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await updateContactApi(contact.targetUserId, {
        alias: alias.trim() || undefined,
        remark: remark.trim() || undefined,
        tags: tags.map((item) => item.trim()).filter(Boolean),
      });
      const payload = response as ContactListItem | { data?: ContactListItem };
      const nextContact = "_id" in payload ? payload : payload.data;

      if (nextContact?._id) {
        setContactList(
          useChatUsersStore.getState().contactList.map((item) =>
            isSameUserId(item.targetUserId, nextContact.targetUserId) ? nextContact : item,
          ),
        );
      }

      Toast.success("Friend information updated");
    } catch {
      // Toast.error("Failed to update friend information. Please try again later.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!contact || isBusy || isBlocked) {
      if (contact && isBlocked) {
        Toast.warning("This friend is blocked. Messages cannot be sent.");
      }

      return;
    }

    setIsSending(true);

    try {
      await onSendMessage(contact.targetUserId);
      onCancel();
    } catch {
      // Toast.error("Failed to create conversation. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleBlocked = async (checked: boolean) => {
    if (!contact || isBusy) {
      return;
    }

    setIsTogglingBlocked(true);

    try {
      if (checked) {
        await blockContactApi(contact.targetUserId);
      } else {
        await unblockContactApi(contact.targetUserId);
      }

      const nextStatus: ContactStatus = checked ? "BLOCKED" : "ACTIVE";
      updateContactStatus(contact.targetUserId, nextStatus);
      Toast.success(checked ? "Friend blocked" : "Friend unblocked");
    } catch {
      // Toast.error(checked ? "Failed to block friend. Please try again later." : "Failed to unblock friend. Please try again later.");
    } finally {
      setIsTogglingBlocked(false);
    }
  };

  const handleDelete = async () => {
    if (!contact || isBusy) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteContactApi(contact.targetUserId);
      setContactList(
        useChatUsersStore.getState().contactList.filter(
          (item) => !isSameUserId(item.targetUserId, contact.targetUserId),
        ),
      );
      Toast.success("Friend deleted");
      onCancel();
    } catch {
      // Toast.error("Failed to delete friend. Please try again later.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenDeleteConfirm = () => {
    if (!contact || isBusy) {
      return;
    }

    Modal.confirm({
      title: "Delete Friend",
      content: `After deleting ${displayName || String(contact.targetUserId)}, you will no longer be able to open the direct chat with this user.`,
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: {
        type: "danger",
      },
      maskClosable: false,
      centered: true,
      onOk: () => handleDelete(),
    });
  };

  const footer = (
    <>
      <Button
        theme="light"
        type="danger"
        disabled={!contact || isBusy}
        onClick={handleOpenDeleteConfirm}
      >
        Delete Friend
      </Button>
      <Button
        theme="light"
        disabled={!contact || isBusy}
        loading={isSaving}
        onClick={() => void handleSave()}
      >
        Save
      </Button>
      <Button
        type="primary"
        disabled={!contact || isBusy || isBlocked}
        loading={isSending}
        onClick={() => void handleSendMessage()}
      >
        {isBlocked ? "Blocked" : "Send Message"}
      </Button>
    </>
  );

  return (
    <CommonModal
      open={open}
      onCancel={onCancel}
      title="Friend Details"
      description={contact ? `User ID: ${contact.targetUserId}` : undefined}
      width={620}
      maskClosable={!isBusy}
      footer={footer}
    >
      <div className="flex flex-col gap-[20px] pb-[12px]">
        <div className="flex items-center gap-[16px] rounded-[10px] bg-slate-50 px-[16px] py-[14px]">
          <Avatar size="large" src={avatarUrl ?? DEFAULT_AVATAR}>
            {String(displayName || contact?.targetUserId || "?").slice(0, 1)}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold text-slate-900">
              {displayName || String(contact?.targetUserId ?? "")}
            </div>
            <div className="mt-[4px] truncate text-[12px] text-slate-500">
              {contact?.targetUserId}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-[8px]">
            <span className="text-[13px] font-medium text-slate-700">Block</span>
            <Switch
              checked={isBlocked}
              disabled={!contact || isBusy}
              loading={isTogglingBlocked}
              onChange={(checked) => void handleToggleBlocked(checked)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[16px]">
          <div>
            <div className="mb-[8px] text-[13px] font-medium text-slate-700">
              alias
            </div>
            <Input
              value={alias}
              maxLength={100}
              placeholder="Enter friend alias"
              disabled={!contact || isBusy}
              onChange={(value) => setAlias(value)}
            />
          </div>

          <div>
            <div className="mb-[8px] text-[13px] font-medium text-slate-700">
              remark
            </div>
            <TextArea
              value={remark}
              rows={4}
              maxCount={500}
              maxLength={500}
              placeholder="Enter notes"
              disabled={!contact || isBusy}
              onChange={(value) => setRemark(value)}
            />
          </div>

          <div>
            <div className="mb-[8px] text-[13px] font-medium text-slate-700">
              tags
            </div>
            <TagInput
              value={tags}
              max={20}
              maxLength={64}
              showClear
              addOnBlur
              draggable
              allowDuplicates={false}
              placeholder="Enter a tag and press Enter"
              disabled={!contact || isBusy}
              onChange={(value) =>
                setTags(value.map((item) => item.trim()).filter(Boolean))
              }
            />
          </div>
        </div>
      </div>
    </CommonModal>
  );
}

export default ContactDetailModal;
