# Order Notifications Backend Contract

The dashboard frontend now supports:

- real dashboard stats from `/admin/orders`
- live order detection by polling `GET /admin/orders`
- optional realtime delivery through a WebSocket URL configured in `environment.realtime.notificationsUrl`
- browser notifications when the admin tab is in the background and the user grants permission

To make notifications arrive when the dashboard website is closed, the backend must deliver them server-side.

## Recommended backend flow

1. When the store creates an order, emit an `order.created` event from the backend.
2. Broadcast that event to admins through Socket.IO or WebSocket.
3. Persist the notification in your database so the dashboard can fetch missed events later.
4. Send the same event to an external provider for phone delivery.

## WebSocket payload expected by the frontend

The frontend accepts any of these message shapes:

```json
{
  "type": "order.created",
  "data": {
    "_id": "order_id",
    "orderNumber": "58332475",
    "currency": "EGP",
    "totalAmount": 950,
    "createdAt": "2026-04-20T10:15:00.000Z",
    "customer": {
      "name": "Ahmed"
    }
  }
}
```

or

```json
{
  "order": {
    "_id": "order_id",
    "orderNumber": "58332475"
  }
}
```

## Phone delivery

Sending to WhatsApp when the website is closed cannot be done from Angular alone. It must be done from the backend using a provider such as:

- WhatsApp Cloud API
- Twilio WhatsApp
- Vonage Messages API

Typical server payload:

```json
{
  "to": "+201234567890",
  "template": "new_order_alert",
  "variables": {
    "orderNumber": "58332475",
    "customerName": "Ahmed",
    "total": "950 EGP"
  }
}
```

## Frontend config

After your backend exposes realtime notifications, set:

```ts
realtime: {
  notificationsUrl: 'wss://your-backend.example.com/admin/notifications',
  orderPollingIntervalMs: 15000,
}
```
