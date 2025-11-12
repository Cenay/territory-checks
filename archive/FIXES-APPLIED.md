# Workflow Import Fixes Applied

## Error: "Could not find property option"

This error occurred because the original workflow contained invalid parameters for certain nodes.

## Fixes Applied

### 1. **Gmail Trigger Node** (Line 4-11)
**Problem:** Missing or invalid filter structure
**Fix:**
```json
"filters": {}  // Changed from "filters": {"labelIds": [], "sender": ""}
```

### 2. **Find Consultant in AC Node** (Line 74-84)
**Problem:** ActiveCampaign doesn't have a "get by email" operation
**Original (BROKEN):**
```json
{
  "resource": "contact",
  "operation": "get",
  "email": "={{ $json.consultant_email }}",
  "simple": false,
  "options": {}
}
```

**Fixed:**
```json
{
  "resource": "contact",
  "operation": "getAll",
  "returnAll": false,
  "limit": 1,
  "options": {
    "email": "={{ $json.consultant_email }}"
  }
}
```
- Changed operation from "get" to "getAll"
- Moved email to options
- Added returnAll and limit parameters
- Removed invalid "simple" parameter

### 3. **Consultant Exists? Node** (Line 87-95)
**Problem:** Invalid parameters for IF node
**Original (BROKEN):**
```json
{
  "conditions": {
    "boolean": []
  },
  "combineOperation": "combineAll",
  "alwaysOutputData": true
}
```

**Fixed:**
```json
{
  "conditions": {
    "number": [
      {
        "value1": "={{ $json.length || 0 }}",
        "operation": "largerEqual",
        "value2": 1
      }
    ]
  }
}
```
- Removed invalid `combineOperation` parameter
- Removed invalid `alwaysOutputData` parameter
- Changed from empty boolean condition to number check
- Checks if getAll returned any results (length >= 1)

### 4. **Information Extractor Node** (Line 15)
**Problem:** typeVersion mismatch
**Fix:**
```json
"typeVersion": 1  // Changed from 1.2
```

### 5. **IF Node typeVersion** (Line 68)
**Problem:** typeVersion 2.2 doesn't exist
**Fix:**
```json
"typeVersion": 2  // Changed from 2.2
```

### 6. **Code Node** (Line 253)
**Problem:** Missing language parameter for v2
**Fix:**
```json
{
  "language": "javaScript",
  "jsCode": "..."
}
```

### 7. **Gmail Reply Node** (Line 272-280)
**Problem:** Missing replyType parameter
**Fix:**
```json
{
  "operation": "reply",
  "messageId": "={{ $('Gmail Trigger').item.json.id }}",
  "message": "=...",
  "options": {}
}
```
- Removed invalid `replyType` parameter

### 8. **Airtable Nodes** (Line 230, 288)
**Problem:** Missing `operation` parameter
**Fix:**
```json
{
  "operation": "search",  // or "create"
  ...
}
```

### 9. **Gmail Label Node** (Line 318-325)
**Problem:** Invalid labelIds structure
**Original (BROKEN):**
```json
{
  "labelIds": {
    "labelIds": ["..."]
  }
}
```

**Fixed:**
```json
{
  "labelIds": ["={{ ... }}"]
}
```

### 10. **Update Territory Fields Node** (Line 208)
**Problem:** Reference to potentially non-existent contact ID
**Fix:**
```json
"contactId": "={{ $json.id || $json[0].id }}"
```
- Handles both new consultant (single object) and existing consultant (array) cases

---

## How to Prevent This in Future

### Best Practices for n8n Workflow JSON Creation:

1. **Always use `get_node_essentials` first** to understand required vs optional parameters
2. **Validate typeVersions** - Check actual node versions, don't assume
3. **Test parameter names** - Use `search_node_properties` to find correct parameter names
4. **Use `validate_node_operation`** before building full workflow
5. **Build incrementally** - Test each node type individually before combining

### Validation Checklist Before Export:

- [ ] All typeVersion numbers are integers (not floats like 1.2, 2.2)
- [ ] No custom parameters that don't exist in node schema
- [ ] IF nodes use proper condition structure (no combineOperation, alwaysOutputData)
- [ ] ActiveCampaign operations match available operations (use getAll, not get by field)
- [ ] Code nodes include `language` parameter for v2
- [ ] Airtable nodes include `operation` parameter
- [ ] Gmail nodes don't include deprecated parameters

### Testing Strategy:

1. **Start with minimal workflow** (trigger → single action node)
2. **Import and test** each addition
3. **Fix errors immediately** before adding more nodes
4. **Document fixes** for future reference

---

## Current Status

✅ **FIXED workflow file:** `territory-check-workflow-FIXED.json`

This file is now ready to import into n8n version 1.117.3.

## Remaining Configuration

You still need to replace these placeholder IDs:
- `CONTACT_NETWORK_FIELD_ID`
- `PERSON_TYPE_FIELD_ID`
- `TERRITORY_CHECKS_FIELD_ID`
- `CURRENT_TERRITORY_CHECK_FIELD_ID`
- `FRANCHISE_CONSULTANT_LIST_ID`
- `CONSULTANT_TAG_ID`
- `TERRITORY_CHECK_TAG_ID`
- `AIRTABLE_BASE_ID`
- `TERRITORIES_TABLE_ID`
- `FRANCHISE_INQUIRIES_TABLE_ID`
- `LABEL_PROCESSED_YES` (Gmail label ID)
- `LABEL_PROCESSED_NO` (Gmail label ID)

---

**Version:** 1.1 (Fixed)
**Created:** 2025-11-03
**Last Updated:** 2025-11-03