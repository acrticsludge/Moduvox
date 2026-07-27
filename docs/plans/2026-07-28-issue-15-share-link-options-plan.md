# Plan: Improve Share Link Access Options

## Implementation Order

### Step 1: Add access level concept to share settings
**File:** `frontend/components/dashboard/ShareSettingsPanel.tsx`
- Add a "Who can access" section at the top with two radio-style buttons:
  - **Public**: Anyone with the link (default)
  - **Restricted**: Requires password or email verification
- When "Public" is selected, hide password and email gate options (expiration still visible)
- When "Restricted" is selected, show password and email gate options
- Add a summary line: "Anyone with the link can watch without verification" / "Password required" / "Email required"

### Step 2: Update settings state management
**File:** `frontend/components/dashboard/ShareSettingsPanel.tsx`
- When toggling from Restricted → Public:
  - Clear password if set (ask confirmation)
  - Disable email gate
- When toggling from Public → Restricted:
  - Show password and/or email gate options

### Step 3: Add confirmation for clearing password
- If switching from password-protected to public, show a confirmation dialog
- "This will remove password protection. Anyone with the link can view."

## Verification
1. Open share settings → see "Who can access" toggle
2. Default is "Public" → password/email options hidden
3. Switch to "Restricted" → password and email options appear
4. Set password, switch to Public → confirmation dialog
5. Summary line updates correctly
6. Existing share links continue to work
7. ShareSettingsPanel still saves correctly to the API
