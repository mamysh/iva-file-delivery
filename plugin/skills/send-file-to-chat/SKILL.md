---
name: send-file-to-chat
description: Use when the owner asks Iva to send, attach, or deliver a local file in the current Telegram chat.
---

# Send a file to the current chat

Use `file_delivery__send_document` when the owner asks for a generated or extracted
file as a Telegram attachment.

1. Create the finished file under `vault/attachments/`. Prefer a dated `outgoing/`
   directory and a clear filename.
2. Call `file_delivery__send_document` with the path relative to `vault/attachments/`.
   Never pass an absolute path. Use `file_name` only when the stored filename is
   unsuitable for the owner.
3. After a successful tool result, reply normally with a short explanation. The tool
   intentionally has no caption: ordinary reply text must continue through Iva's Outbox.

The tool sends only to the authenticated owner's current private Telegram chat. It
must refuse groups, other chats, schedules, CLI turns, paths outside
`vault/attachments/`, hidden files, empty files, and files above 50 MB.

Never fall back to the Telegram userbot, Saved Messages, a public file host, or a
user-supplied `chat_id`. Never expose the bot token, absolute server path, or raw
trace. If delivery fails, report the safe tool error and leave the file on disk for
a retry.
