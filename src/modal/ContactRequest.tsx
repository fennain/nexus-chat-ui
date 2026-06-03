import { Button, TextArea, Toast } from "@douyinfe/semi-ui";
import { useEffect, useState } from "react";
import { createContactRequestApi } from "@/api/modules";
import CommonModal from "@/components/Modal";
import { hasUserId } from "@/lib/chatUser";
import type { ChatUserId } from "@/types";

interface ContactRequestProps {
  open: boolean;
  userId?: ChatUserId;
  userName?: string;
  getPopupContainer?: () => HTMLElement;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function ContactRequest({
  open,
  userId,
  userName,
  getPopupContainer,
  onCancel,
  onSuccess,
}: ContactRequestProps) {
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setRequestMessage("");
    setIsSubmittingRequest(false);
  }, [open, userId]);

  const handleClose = () => {
    if (isSubmittingRequest) {
      return;
    }

    onCancel();
  };

  const handleSubmitRequest = async () => {
    if (!hasUserId(userId) || isSubmittingRequest) {
      return;
    }

    setIsSubmittingRequest(true);

    try {
      await createContactRequestApi(userId, requestMessage.trim() || undefined);
      Toast.success("Friend request sent");
      onSuccess?.();
      onCancel();
    } catch {
      // The global request interceptor displays backend errors.
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const requestModalFooter = (
    <>
      <Button
        theme="light"
        onClick={handleClose}
        disabled={isSubmittingRequest}
      >
        Cancel
      </Button>
      <Button
        type="primary"
        loading={isSubmittingRequest}
        onClick={() => void handleSubmitRequest()}
      >
        Confirm
      </Button>
    </>
  );

  return (
    <CommonModal
      open={open}
      onCancel={handleClose}
      title="Send Friend Request"
      description={userName ? `Send a request to ${userName}` : undefined}
      width={520}
      maskClosable={false}
      footer={requestModalFooter}
      getPopupContainer={getPopupContainer}
    >
      <div className="pb-[12px]">
        <TextArea
          value={requestMessage}
          rows={4}
          maxCount={500}
          maxLength={500}
          placeholder="Enter request message"
          onChange={(value) => setRequestMessage(value)}
        />
      </div>
    </CommonModal>
  );
}

export default ContactRequest;
