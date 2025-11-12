# Gmail Trigger - CORRECTED Configuration

## From Your Working Workflow

Based on your existing "Franchise Territory Checks first draft - fail" workflow, here's the CORRECT Gmail Trigger configuration:

### Parameters (from actual working node):
```json
{
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "simple": false,
  "filters": {
    "readStatus": "unread"
  },
  "options": {}
}
```

## UI Configuration Steps:

1. **Poll Times:**
   - Set to "Every Minute"

2. **Simplify Toggle:**
   - **Turn OFF** (leave unchecked)
   - In JSON this is `"simple": false`
   - This gives you full email data including headers, HTML, etc.

3. **Filters:**
   - Click "Add Filter"
   - **Read Status:** Select "Unread emails only"
   - In JSON this is `"readStatus": "unread"`

4. **Options:**
   - Leave empty

## Why These Settings Matter:

- **`simple: false`** - Returns full email object with all fields needed for AI extraction
- **`readStatus: "unread"`** - Only processes new emails, prevents reprocessing
- **Poll every minute** - Checks for new emails frequently

## Your Existing Credentials:
Your working workflow uses:
- **Credential Name:** "Gmail (FranchiseTRFA)"
- **Credential ID:** w4vtE8fEEGHrj6S2

You can reuse this same credential for the new workflow.
