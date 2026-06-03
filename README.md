# nexus-chat-ui

`nexus-chat-ui` 是一个面向 Nexus IM 的 React 聊天组件包。业务项目只需要提供 WebSocket 地址、HTTP API 地址、用户 ID 和 token，就可以接入单聊、群聊、联系人、好友申请、历史消息、未读数和自动重连等聊天能力。

## 适用环境

- React `^19.0.0`
- React DOM `^19.0.0`
- Node.js `>=18`
- 业务项目需要支持 CSS 打包导入


## 安装

```bash
pnpm add nexus-chat-ui
```

如果项目还没有安装 React 19：

```bash
pnpm add react@^19 react-dom@^19
```

## 最小接入

```tsx
import { NexusChatUI } from 'nexus-chat-ui'

export default function ChatPage() {
  return (
    <div style={{ height: '100vh' }}>
      <NexusChatUI
        wsUrl="wss://im.example.com/ws"
        httpUrl="https://im.example.com"
        searchUrl="https://im.example.com/api/v1/public/search_user"
        getUserUrl="https://im.example.com/api/v1/public/search_list"
        token="USER_TOKEN"
        userId="10001"
      />
    </div>
  )
}
```

组件本身会撑满父容器高度，接入时请给外层容器设置明确高度，例如 `100vh`、`600px` 或业务布局中的剩余高度。

## Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `wsUrl` | `string` | 是 | - | WebSocket 长连接地址，用于消息收发。 |
| `httpUrl` | `string` | 是 | - | HTTP API baseURL，包内 axios 请求会基于它访问会话、群聊、联系人等接口。 |
| `searchUrl` | `string` | 是 | - | 业务平台提供的用户搜索接口地址，用于按关键字查找用户并获取目标用户 `userId`。 |
| `getUserUrl` | `string` | 是 | - | 业务平台提供的用户头像与昵称批量查询接口地址，用于按 `userId` 补齐展示资料。 |
| `token` | `string` | 是 | - | 鉴权 token。HTTP 请求使用 `Authorization: Bearer <token>`，WebSocket 会拼到查询参数 `token`。 |
| `userId` | `string \| number` | 是 | - | 当前登录用户 ID。 |
| `connectionParams` | `Record<string, string \| number \| boolean \| undefined>` | 否 | `undefined` | 额外 WebSocket 查询参数。 |
| `placeholder` | `string` | 否 | `Type message here` | 输入框占位文案。 |
| `className` | `string` | 否 | `undefined` | 根节点自定义 className。 |
| `disabled` | `boolean` | 否 | `false` | 是否禁用输入区域。 |
| `autoConnect` | `boolean` | 否 | `true` | 组件挂载后是否自动建立 WebSocket 连接。 |
| `emptyMessageText` | `string` | 否 | - | 当前会话无消息时显示的占位文案。 |
| `onMessageReceive` | `(message: ChatMessageItem) => void` | 否 | `undefined` | 收到服务端消息后的回调。 |
| `onConnectionStatusChange` | `(status: ChatConnectionStatus) => void` | 否 | `undefined` | 连接状态变化回调。 |
| `onError` | `(error: Event \| Error \| unknown) => void` | 否 | `undefined` | 连接或消息处理异常回调。 |

## 业务平台需提供的用户接口

聊天系统内部只保存用户 `userId`，不直接存储业务侧的用户昵称和头像。因此业务平台在接入时需要额外提供两个用户相关接口，并分别通过 `searchUrl` 和 `getUserUrl` 传入组件。

### searchUrl：用户搜索接口

`searchUrl` 用于根据关键字搜索业务平台用户，通常发生在“添加好友”场景。组件会通过该接口获取目标用户的 `userId`，再基于这个 `userId` 发起好友申请。

请求体：

```ts
{
  search_content: string
}
```

返回结果建议包含用户 ID、昵称和头像：

```ts
Array<{
  id: string
  nickname?: string
  avatar?: string
  email?: string
}>
```

### getUserUrl：用户头像与昵称查询接口

`getUserUrl` 用于批量查询用户展示资料。聊天组件在加载会话、群聊、联系人、消息发送人等数据后，会收集其中涉及的多个 `userId`，通过该接口一次性补齐用户昵称和头像。

请求体：

```ts
{
  user_id_list: string[]
}
```

返回结果：

```ts
Array<{
  userId: string
  userName: string
  avatarUrl: string
}>
```

## 完整示例

```tsx
import { useState } from 'react'
import { NexusChatUI, type ChatConnectionStatus } from 'nexus-chat-ui'

export function CustomerServiceChat() {
  const [status, setStatus] = useState<ChatConnectionStatus>('idle')

  return (
    <section style={{ height: 720 }}>
      <div>连接状态：{status}</div>

      <NexusChatUI
        wsUrl="wss://im.example.com/ws"
        httpUrl="https://im.example.com"
        searchUrl="https://account.example.com/api/v1/public/search_user"
        getUserUrl="https://account.example.com/api/v1/public/search_list"
        token={localStorage.getItem('token') ?? ''}
        userId={localStorage.getItem('userId') ?? ''}
        connectionParams={{
          client: 'web',
          tenantId: 'tenant-a',
        }}
        placeholder="请输入消息"
        onConnectionStatusChange={setStatus}
        onMessageReceive={(message) => {
          console.log('received message:', message)
        }}
        onError={(error) => {
          console.error('chat error:', error)
        }}
      />
    </section>
  )
}
```
