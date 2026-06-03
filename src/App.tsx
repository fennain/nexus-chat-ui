import { Button, Form } from "@douyinfe/semi-ui";
import { useState } from "react";
import { NexusChatUI } from "@/index";
import { isSameUserId } from "@/lib/chatUser";
import type { ChatConnectionStatus, ChatUserId } from "@/types";
import { demoUsers } from "@/constants/demoUsers";

const defaultDemoUser = demoUsers[0];
const demoSearchUrl = "http://192.168.199.73:7010/api/v1/public/search_user";
const demoGetUserUrl =
  "http://192.168.199.73:7010/api/v1/public/search_list";

function App() {
  const [submittedUserId, setSubmittedUserId] = useState(
    defaultDemoUser?.userId ?? "",
  );
  const [submittedToken, setSubmittedToken] = useState(
    defaultDemoUser?.token ?? "",
  );
  const [shouldShowChat, setShouldShowChat] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ChatConnectionStatus>("idle");

  const handleConnect = ({ userId }: { userId: ChatUserId }) => {
   
    const selectedUser = demoUsers.find((item) => isSameUserId(item.userId, userId));

    if (!selectedUser) {
      return;
    }

    setSubmittedUserId(selectedUser.userId);
    setSubmittedToken(selectedUser.token ?? "");
    setShouldShowChat(true);
  };

  return (
    <main className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 md:px-4 md:py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Form
          layout="vertical"
          initValues={{ userId: defaultDemoUser?.userId }}
          onSubmit={handleConnect}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <Form.Select
              label="Test account"
              field="userId"
              fieldClassName="mb-0 flex-1"
              rules={[{ required: true, message: "Please select a test account" }]}
              placeholder="Select a test account"
              disabled={shouldShowChat}
              optionList={demoUsers.map((user) => ({
                value: user.userId,
                label: `${user.userName ?? user.userId} (${user.userId})`,
              }))}
            />
            <Button
              type="primary"
              htmlType="submit"
              disabled={shouldShowChat}
              className="h-10"
            >
              {shouldShowChat ? "Chat connected" : "Connect chat"}
            </Button>
          </div>
        </Form>
        <p className="mt-2 text-xs text-slate-500">
          Current connection status: {connectionStatus}
        </p>
      </section>
      <div className="flex-1 overflow-hidden">
        {shouldShowChat ? (
          <NexusChatUI
            onConnectionStatusChange={setConnectionStatus}
            token={submittedToken}
            wsUrl="ws://192.168.199.73:4100/ws"
            httpUrl="http://192.168.199.73:4100"
            searchUrl={demoSearchUrl}
            getUserUrl={demoGetUserUrl}
            userId={submittedUserId}
            placeholder="Type message here"
          />
        ) : null}
      </div>
    </main>
  );
}

export default App;
