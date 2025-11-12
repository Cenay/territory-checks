# Importing ActiveCampaign Nodes - Instructions

The n8n API merge is hitting token limits due to the large workflow response. Here's the manual approach:

## Option 1: Copy From Existing Workflow (Easiest)

1. Open your "Franchise Territory Checks first draft - fail" workflow
2. **Select these 6 nodes** (if they exist, or create them following the guide)
3. Press `Ctrl+C` (or `Cmd+C` on Mac) to copy
4. Open "Franchise Territory Checks - Third Draft"
5. Press `Ctrl+V` to paste
6. Reposition and reconnect them

## Option 2: Manual Node Creation

Follow Step 4 in `MANUAL-BUILD-GUIDE-v2.md` to manually create each node.

## Option 3: JSON Export/Import (If n8n supports it)

Some versions of n8n allow you to:
1. Export nodes as JSON
2. Import JSON into another workflow

Check if your n8n version supports this in the UI.

## Required Connections

After adding the 6 nodes, connect them:

```
Is Territory Check (TRUE branch)
  ↓
Find Consultant (ActiveCampaign)
  ↓
Consultant Exists? (IF)
  ├─ TRUE (output 0) → Add to Consultant List
  └─ FALSE (output 1) → Create Consultant
                          ↓
                     Add to Consultant List
                          ↓
                     Tag: Consultant
                          ↓
                     Tag: Territory Check
                          ↓
                     IF: All Required Fields Present?
```

## Placeholder IDs to Replace

Before activating, replace these in each ActiveCampaign node:

1. **Credential ID** (all 6 nodes)
   - Find in: n8n → Credentials → ActiveCampaign
   - Replace: `YOUR_ACTIVECAMPAIGN_CREDENTIAL_ID`

2. **Network Field ID** (Create Consultant node)
   - Find in: ActiveCampaign → Settings → Fields → Custom Fields
   - Replace: `YOUR_NETWORK_FIELD_ID`

3. **Person Type Field ID** (Create Consultant node)
   - Find in: ActiveCampaign → Settings → Fields → Custom Fields
   - Replace: `YOUR_PERSON_TYPE_FIELD_ID`

4. **Consultant List ID** (Add to Consultant List node)
   - Find in: ActiveCampaign → Contacts → Lists
   - Replace: `YOUR_CONSULTANT_LIST_ID`

5. **Consultant Tag ID** (Tag: Consultant node)
   - Find in: ActiveCampaign → Contacts → Tags
   - Replace: `YOUR_CONSULTANT_TAG_ID`

6. **Territory Check Tag ID** (Tag: Territory Check node)
   - Find in: ActiveCampaign → Contacts → Tags
   - Replace: `YOUR_TERRITORY_CHECK_TAG_ID`

## Progress Summary

✅ **Completed:**
- JavaScript parser created (`parse-email-code-node_v2.js`)
- Fixed prospect_email extraction (never uses forwarding addresses)
- Fixed territory extraction (network-specific patterns)
- Updated build guide (`MANUAL-BUILD-GUIDE-v2.md`)
- Distilled session to `current-progress-v2.md`

⏳ **In Progress:**
- Adding 6 ActiveCampaign nodes to workflow EAvbHK2C2PVJD6KR

📋 **Next Steps:**
- Import/create the 6 ActiveCampaign nodes manually
- Replace all placeholder IDs
- Test with sample emails from `/specs/samples.md`
- Update Airtable logging to use new field names
- Update Gmail replies to use new field names

## Why API Merge Failed

The n8n API returns very large JSON responses (29k+ tokens) when fetching workflows, which exceeds our tool's 25k token limit. The partial update API requires reading the full workflow first, causing this limitation.

Manual node creation in the UI avoids this issue entirely.
