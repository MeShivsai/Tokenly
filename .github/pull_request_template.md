## Summary

<!-- What does this PR change, and why? -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Security fix
- [ ] Refactor (no behaviour change)
- [ ] Docs or build/CI only

## How was this tested?

<!-- Steps you ran, on which OS. For bug fixes, confirm the original repro no longer fails. -->

## Checklist

- [ ] `npm run build` passes (TypeScript compiles)
- [ ] `cargo clippy` and `cargo test` pass in `src-tauri/`
- [ ] Tested the change in the running app (`npm run tauri dev`)
- [ ] No real credentials, vault files or secrets in code, tests, screenshots or logs
- [ ] README / wiki updated if user-facing behaviour changed

### If this touches `crypto.rs`, `vault.rs`, or the vault file format

- [ ] Existing vaults still unlock after this change (or a migration is included)
- [ ] Failure cases tested: wrong password, corrupted file, interrupted write
- [ ] Explained in the summary why the change is safe
