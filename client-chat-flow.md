# Nexus Go 客户端聊天流程

本文档面向前端、SDK 和接入方开发人员，说明在当前 Nexus Go 能力下，客户端如何实现单聊和群聊。

Nexus Go 当前提供：

- REST API：创建/查询会话、频道、历史消息等。
- WebSocket：加入会话/频道房间、发送实时消息、接收实时消息。

当前版本还没有完整的未读数、会话更新推送、离线消息自动推送和 lastMessage 自动维护。因此客户端需要通过“会话列表 + 历史消息 + WebSocket join”组合实现聊天体验。

## 1. 核心概念

### 1.1 用户身份

客户端请求 REST API 和 WebSocket 时都需要携带 JWT。

REST API：

```http
Authorization: Bearer <jwt>
```

WebSocket：

```text
ws://<host>:<port>/ws?token=<jwt>
```

Nexus Go 会读取 JWT 中的 `sub` 作为当前用户 ID。

### 1.2 Conversation 和 Channel

Nexus Go 有两种聊天房间：

| 类型  | roomType       | 说明           |
| --- | -------------- | ------------ |
| 单聊  | `CONVERSATION` | 两个用户之间的会话。   |
| 群聊  | `CHANNEL`      | 多个用户组成的频道/群。 |

发送消息时不直接传“发给谁”，而是传：

```json
{
  "roomType": "CONVERSATION",
  "roomId": "conversation_id"
}
```

或：

```json
{
  "roomType": "CHANNEL",
  "roomId": "channel_id"
}
```

服务端根据 `roomType + roomId` 判断消息属于哪个单聊或群聊。

### 1.3 WebSocket join 的含义

`room:join` 不是“加入群成员关系”，而是：

> 当前这条 WebSocket 连接订阅某个会话/频道的实时消息。

用户打开某个聊天窗口时，客户端应该：

1. 加载历史消息。
2. 发送 `room:join`。
3. 之后通过 WebSocket 接收新消息。

## 2. 页面初始化流程

用户打开应用页面后，建议立即建立 WebSocket 连接。

```text
页面加载
  ↓
获取当前用户 JWT
  ↓
连接 WebSocket
  ↓
查询会话列表和群聊列表
  ↓
渲染聊天列表
```

WebSocket 地址：

```text
ws://<host>:<port>/ws?token=<jwt>
```

连接成功后可以发送 heartbeat 测试：

```json
{
  "event": "heartbeat",
  "data": {}
}
```

预期返回：

```json
{
  "event": "heartbeat:ack",
  "data": {
    "ok": true
  }
}
```

查询单聊会话列表：

```http
GET /api/v1/conversations
Authorization: Bearer <jwt>
```

查询我的群聊：

```http
GET /api/v1/channels
Authorization: Bearer <jwt>
```

或查询我的频道 membership 设置：

```http
GET /api/v1/my/channels
Authorization: Bearer <jwt>
```

## 3. 单聊流程

### 3.1 user1 点击 user2 发起聊天

当 user1 在页面上点击 user2 头像或联系人时，前端调用：

```http
POST /api/v1/conversations
Authorization: Bearer <user1 jwt>
Content-Type: application/json

{
  "userId": "user2"
}
```

该接口是 `FindOrCreate` 语义：

- 如果 user1 和 user2 已经有单聊，返回已有 conversation。
- 如果没有，创建新 conversation。

返回示例：

```json
{
  "data": {
    "_id": "conversation_id",
    "participants": ["user1", "user2"],
    "e2eeScheme": "PAIRWISE",
    "createdAt": "2026-05-09T00:00:00Z",
    "updatedAt": "2026-05-09T00:00:00Z"
  },
  "ts": 1778300000000
}
```

客户端拿到：

```text
roomType = CONVERSATION
roomId = conversation_id
```

### 3.2 打开聊天窗口并加载历史消息

```http
GET /api/v1/messages?roomType=CONVERSATION&roomId=<conversation_id>
Authorization: Bearer <user1 jwt>
```

返回最近一页消息。

### 3.3 加入单聊 WebSocket 房间

```json
{
  "event": "room:join",
  "data": {
    "roomType": "CONVERSATION",
    "roomId": "conversation_id"
  }
}
```

预期返回：

```json
{
  "event": "room:joined",
  "data": {
    "room": "room:CONVERSATION:conversation_id"
  }
}
```

### 3.4 发送单聊消息

```json
{
  "event": "message:send",
  "data": {
    "roomType": "CONVERSATION",
    "roomId": "conversation_id",
    "type": "TEXT",
    "ciphertext": "hello"
  }
}
```

发送方收到：

```json
{
  "event": "message:sent",
  "data": {
    "_id": "message_id",
    "roomType": "CONVERSATION",
    "roomId": "conversation_id",
    "senderId": "user1"
  }
}
```

如果 user2 的 WebSocket 也已经 join 同一个 conversation room，user2 会收到：

```json
{
  "event": "message:new",
  "data": {
    "_id": "message_id",
    "roomType": "CONVERSATION",
    "roomId": "conversation_id",
    "senderId": "user1"
  }
}
```

### 3.5 user2 打开同一个单聊

user2 可以通过两种方式打开这个 conversation：

方式一：从会话列表进入。

```http
GET /api/v1/conversations
Authorization: Bearer <user2 jwt>
```

找到 participants 包含 user1 和 user2 的 conversation。

方式二：点击 user1 头像，调用同一个 `FindOrCreate` 接口。

```http
POST /api/v1/conversations
Authorization: Bearer <user2 jwt>
Content-Type: application/json

{
  "userId": "user1"
}
```

如果 conversation 已存在，会返回同一个 `conversation_id`。

然后 user2：

1. `GET /messages` 加载历史消息。
2. WebSocket 发送 `room:join`。
3. 开始接收后续实时消息。

## 4. 群聊流程

### 4.1 创建群聊

```http
POST /api/v1/channels
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "项目讨论群",
  "description": "项目组内部讨论",
  "type": "PRIVATE",
  "e2eeEnabled": false
}
```

返回示例：

```json
{
  "data": {
    "_id": "channel_id",
    "name": "项目讨论群",
    "type": "PRIVATE",
    "createdBy": "user1",
    "members": ["user1"],
    "e2eeEnabled": false,
    "senderKeyVersion": 0
  },
  "ts": 1778300000000
}
```

### 4.2 添加群成员

```http
POST /api/v1/channels/<channel_id>/members
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "userId": "user2"
}
```

当前版本中，只要请求用户是群成员，就可以添加成员。后续产品化建议补充 OWNER/ADMIN 权限控制。

### 4.3 打开群聊并加载历史消息

```http
GET /api/v1/messages?roomType=CHANNEL&roomId=<channel_id>
Authorization: Bearer <jwt>
```

### 4.4 加入群聊 WebSocket 房间

```json
{
  "event": "room:join",
  "data": {
    "roomType": "CHANNEL",
    "roomId": "channel_id"
  }
}
```

### 4.5 发送群消息

```json
{
  "event": "message:send",
  "data": {
    "roomType": "CHANNEL",
    "roomId": "channel_id",
    "type": "TEXT",
    "ciphertext": "大家好"
  }
}
```

发送方收到 `message:sent`。

已经 join 该 channel room 的其他成员会收到 `message:new`。

未 join 该 channel room 的成员不会实时收到该消息通知，但后续打开群聊时可以通过历史消息接口查询到。

## 5. 离线和刷新后的消息查看

当前版本没有服务端未读数。

如果 user1 给 user2 发消息时 user2 不在线：

```text
user1 发送消息
  ↓
消息保存到 MongoDB
  ↓
user2 不在线，不会收到 WebSocket 推送
```

user2 后续上线后：

```text
user2 打开页面
  ↓
连接 WebSocket
  ↓
GET /conversations 查询自己的会话列表
  ↓
点击 conversation
  ↓
GET /messages 查询历史消息
  ↓
room:join
  ↓
接收后续实时消息
```

如果 user2 刷新页面，也同理：

1. 重新连接 WebSocket。
2. 查询会话列表。
3. 打开具体会话。
4. 加载历史消息。
5. join 对应 room。

## 
