## Summary

Describe the user-visible change and its motivation.

## Security and privacy

- [ ] No token, real chat/user ID, private file content, local path, full trace or unsanitized log is included.
- [ ] Destination remains derived from the authenticated current private Telegram turn.
- [ ] File access remains confined to `vault/attachments/`; no public upload fallback was added.
- [ ] New inputs, outputs, network access and third-party processing are documented, or this change adds none.

## Verification

- [ ] `npm run check`
- [ ] `npm audit --audit-level=high`
- [ ] Documentation and CHANGELOG updated where needed
