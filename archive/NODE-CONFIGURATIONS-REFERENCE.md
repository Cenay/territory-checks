# Territory Check Workflow - Complete Node Configuration Reference

This document contains the exact configuration for every node in the workflow. Use this as a reference while building manually in the n8n UI.

---

## Node 1: Gmail Trigger

**Node Type:** `n8n-nodes-base.gmailTrigger`
**Type Version:** 1
**Name:** Gmail Trigger

### Parameters:
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

### UI Configuration:
- **Poll Times:** Every Minute
- **Simplify:** OFF (unchecked) - `simple: false`
- **Filters:**
  - **Read Status:** Unread emails only
- **Options:** None

### Credentials Required:
- Gmail OAuth2

### Important Notes:
- The "Simplify" toggle should be OFF to get full email data
- Filter for unread emails to avoid reprocessing

---

## Node 2: Extract Territory Check Data

**Node Type:** `@n8n/n8n-nodes-langchain.informationExtractor`
**Type Version:** 1
**Name:** Extract Territory Check Data

### Parameters:
```json
{
  "text": "={{ $json.textPlain || $json.textHtml }}",
  "schemaType": "fromAttributes",
  "attributes": {
    "attributes": [
      {
        "name": "is_territory_check",
        "type": "boolean",
        "description": "Is this email a territory check request?"
      },
      {
        "name": "network",
        "type": "string",
        "description": "Which network? IFPG/FranServe/FBA/Direct Form"
      },
      {
        "name": "consultant_first_name",
        "type": "string",
        "description": "Consultant first name"
      },
      {
        "name": "consultant_last_name",
        "type": "string",
        "description": "Consultant last name"
      },
      {
        "name": "consultant_email",
        "type": "string",
        "description": "Consultant email"
      },
      {
        "name": "consultant_phone",
        "type": "string",
        "description": "Consultant phone"
      },
      {
        "name": "prospect_first_name",
        "type": "string",
        "description": "Prospect first name"
      },
      {
        "name": "prospect_last_name",
        "type": "string",
        "description": "Prospect last name"
      },
      {
        "name": "prospect_email",
        "type": "string",
        "description": "Prospect email"
      },
      {
        "name": "prospect_phone",
        "type": "string",
        "description": "Prospect phone"
      },
      {
        "name": "territory_city",
        "type": "string",
        "description": "City requested"
      },
      {
        "name": "territory_state",
        "type": "string",
        "description": "State (2-letter code)"
      },
      {
        "name": "territory_county",
        "type": "string",
        "description": "County if mentioned"
      }
    ]
  },
  "options": {}
}
```

### UI Configuration:
- **Text:** `={{ $json.textPlain || $json.textHtml }}`
- **Schema Type:** From Attributes
- **Attributes:** Add 13 attributes as shown above

### Credentials Required:
- OpenAI API (or compatible LLM)

---

## Node 3: Is Territory Check?

**Node Type:** `n8n-nodes-base.if`
**Type Version:** 1
**Name:** Is Territory Check?

### Parameters:
```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.is_territory_check }}",
        "value2": true
      }
    ]
  }
}
```

### UI Configuration:
- **Conditions:** Boolean
  - **Value 1:** `={{ $json.is_territory_check }}`
  - **Operation:** Equal
  - **Value 2:** `true`

---

## Node 4: Find Consultant

**Node Type:** `n8n-nodes-base.activeCampaign`
**Type Version:** 1
**Name:** Find Consultant

### Parameters:
```json
{
  "resource": "contact",
  "operation": "getAll",
  "returnAll": false,
  "limit": 1,
  "additionalFields": {
    "email": "={{ $json.consultant_email }}"
  },
  "continueOnFail": true
}
```

### UI Configuration:
- **Resource:** Contact
- **Operation:** Get All
- **Return All:** No (unchecked)
- **Limit:** 1
- **Additional Fields:**
  - Email: `={{ $json.consultant_email }}`
- **Continue On Fail:** Yes (checked)

### Credentials Required:
- ActiveCampaign API

---

## Node 5: Consultant Exists?

**Node Type:** `n8n-nodes-base.if`
**Type Version:** 1
**Name:** Consultant Exists?

### Parameters:
```json
{
  "conditions": {
    "number": [
      {
        "value1": "={{ $json.length }}",
        "operation": "larger",
        "value2": 0
      }
    ]
  }
}
```

### UI Configuration:
- **Conditions:** Number
  - **Value 1:** `={{ $json.length }}`
  - **Operation:** Larger
  - **Value 2:** `0`

---

## Node 6: Create Consultant

**Node Type:** `n8n-nodes-base.activeCampaign`
**Type Version:** 1
**Name:** Create Consultant

### Parameters:
```json
{
  "resource": "contact",
  "operation": "create",
  "email": "={{ $json.consultant_email }}",
  "updateIfExists": true,
  "additionalFields": {
    "firstName": "={{ $json.consultant_first_name }}",
    "lastName": "={{ $json.consultant_last_name }}",
    "phone": "={{ $json.consultant_phone }}",
    "fieldValues": {
      "fieldValue": [
        {
          "field": "[YOUR_NETWORK_FIELD_ID]",
          "value": "={{ $json.network }}"
        },
        {
          "field": "[YOUR_PERSON_TYPE_FIELD_ID]",
          "value": "Consultant"
        }
      ]
    }
  }
}
```

### UI Configuration:
- **Resource:** Contact
- **Operation:** Create
- **Email:** `={{ $json.consultant_email }}`
- **Update if Exists:** Yes (checked)
- **Additional Fields:**
  - **First Name:** `={{ $json.consultant_first_name }}`
  - **Last Name:** `={{ $json.consultant_last_name }}`
  - **Phone:** `={{ $json.consultant_phone }}`
  - **Field Values:** (Click "Add Field Value" twice)
    - **Field:** [Replace with your Network custom field ID]
    - **Value:** `={{ $json.network }}`
    - **Field:** [Replace with your Person Type custom field ID]
    - **Value:** `Consultant`

### Credentials Required:
- ActiveCampaign API

### IDs to Replace:
- `[YOUR_NETWORK_FIELD_ID]` - Find in ActiveCampaign Settings → Custom Fields → Network field
- `[YOUR_PERSON_TYPE_FIELD_ID]` - Find in ActiveCampaign Settings → Custom Fields → Person Type field

---

## Node 7: Add to Consultant List

**Node Type:** `n8n-nodes-base.activeCampaign`
**Type Version:** 1
**Name:** Add to Consultant List

### Parameters:
```json
{
  "resource": "contactList",
  "operation": "add",
  "listId": "[YOUR_CONSULTANT_LIST_ID]",
  "contactId": "={{ $json.id }}"
}
```

### UI Configuration:
- **Resource:** Contact List
- **Operation:** Add
- **List:** [Replace with your Consultant list ID]
- **Contact:** `={{ $json.id }}`

### Credentials Required:
- ActiveCampaign API

### IDs to Replace:
- `[YOUR_CONSULTANT_LIST_ID]` - Find in ActiveCampaign Lists → Click list → ID in URL

### Connection Note:
This node receives TWO inputs:
1. From "Consultant Exists?" TRUE branch (existing consultant)
2. From "Create Consultant" (newly created consultant)

---

## Node 8: Tag: Consultant

**Node Type:** `n8n-nodes-base.activeCampaign`
**Type Version:** 1
**Name:** Tag: Consultant

### Parameters:
```json
{
  "resource": "contactTag",
  "operation": "add",
  "contactId": "={{ $json.id }}",
  "tagId": "[YOUR_CONSULTANT_TAG_ID]"
}
```

### UI Configuration:
- **Resource:** Contact Tag
- **Operation:** Add
- **Contact:** `={{ $json.id }}`
- **Tag:** [Replace with your Consultant tag ID]

### Credentials Required:
- ActiveCampaign API

### IDs to Replace:
- `[YOUR_CONSULTANT_TAG_ID]` - Find in ActiveCampaign Tags → Click tag → ID in URL

---

## Node 9: Tag: Territory Check

**Node Type:** `n8n-nodes-base.activeCampaign`
**Type Version:** 1
**Name:** Tag: Territory Check

### Parameters:
```json
{
  "resource": "contactTag",
  "operation": "add",
  "contactId": "={{ $json.id }}",
  "tagId": "[YOUR_TERRITORY_CHECK_TAG_ID]"
}
```

### UI Configuration:
- **Resource:** Contact Tag
- **Operation:** Add
- **Contact:** `={{ $json.id }}`
- **Tag:** [Replace with your Territory Check tag ID]

### Credentials Required:
- ActiveCampaign API

### IDs to Replace:
- `[YOUR_TERRITORY_CHECK_TAG_ID]` - Find in ActiveCampaign Tags → Click tag → ID in URL

---

## Node 10: Airtable: Territory Lookup

**Node Type:** `n8n-nodes-base.airtable`
**Type Version:** 2
**Name:** Airtable: Territory Lookup

### Parameters:
```json
{
  "operation": "search",
  "application": "[YOUR_AIRTABLE_BASE_ID]",
  "table": "[YOUR_TERRITORIES_TABLE_ID]",
  "options": {
    "filterByFormula": "AND({City} = '{{ $json.territory_city }}', {State} = '{{ $json.territory_state }}')",
    "returnFieldsByFieldId": false
  }
}
```

### UI Configuration:
- **Operation:** Search
- **Base:** [Replace with your Airtable base ID]
- **Table:** [Replace with your Territories table ID]
- **Options:**
  - **Filter by Formula:** `AND({City} = '{{ $json.territory_city }}', {State} = '{{ $json.territory_state }}')`
  - **Return Fields by Field ID:** No (unchecked)

### Credentials Required:
- Airtable Personal Access Token

### IDs to Replace:
- `[YOUR_AIRTABLE_BASE_ID]` - From Airtable URL (starts with `app`)
- `[YOUR_TERRITORIES_TABLE_ID]` - From Airtable table settings (starts with `tbl`)

---

## Node 11: Territory Available?

**Node Type:** `n8n-nodes-base.if`
**Type Version:** 1
**Name:** Territory Available?

### Parameters:
```json
{
  "conditions": {
    "number": [
      {
        "value1": "={{ $json.length }}",
        "operation": "equal",
        "value2": 0
      }
    ]
  }
}
```

### UI Configuration:
- **Conditions:** Number
  - **Value 1:** `={{ $json.length }}`
  - **Operation:** Equal
  - **Value 2:** `0`

### Logic Note:
- `length = 0` means NOT found in Airtable = territory IS available (TRUE branch)
- `length > 0` means found in Airtable = territory NOT available (FALSE branch)

---

## Node 12: Gmail: Reply YES

**Node Type:** `n8n-nodes-base.gmail`
**Type Version:** 2
**Name:** Gmail: Reply YES

### Parameters:
```json
{
  "resource": "message",
  "operation": "send",
  "emailType": "reply",
  "messageId": "={{ $('Gmail Trigger').item.json.id }}",
  "subject": "={{ 'Re: ' + $('Gmail Trigger').item.json.subject }}",
  "message": "Yes, {{ $('Extract Territory Check Data').item.json.territory_city }}, {{ $('Extract Territory Check Data').item.json.territory_state }} is available.\n\nBest regards,\nThe Real FOO Academy",
  "options": {}
}
```

### UI Configuration:
- **Resource:** Message
- **Operation:** Send
- **Email Type:** Reply
- **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
- **Subject:** `={{ 'Re: ' + $('Gmail Trigger').item.json.subject }}`
- **Message:**
```
Yes, {{ $('Extract Territory Check Data').item.json.territory_city }}, {{ $('Extract Territory Check Data').item.json.territory_state }} is available.

Best regards,
The Real FOO Academy
```

### Credentials Required:
- Gmail OAuth2

---

## Node 13: Gmail: Reply NO

**Node Type:** `n8n-nodes-base.gmail`
**Type Version:** 2
**Name:** Gmail: Reply NO

### Parameters:
```json
{
  "resource": "message",
  "operation": "send",
  "emailType": "reply",
  "messageId": "={{ $('Gmail Trigger').item.json.id }}",
  "subject": "={{ 'Re: ' + $('Gmail Trigger').item.json.subject }}",
  "message": "No, {{ $('Extract Territory Check Data').item.json.territory_city }}, {{ $('Extract Territory Check Data').item.json.territory_state }} is not available at this time.\n\nBest regards,\nThe Real FOO Academy",
  "options": {}
}
```

### UI Configuration:
- **Resource:** Message
- **Operation:** Send
- **Email Type:** Reply
- **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
- **Subject:** `={{ 'Re: ' + $('Gmail Trigger').item.json.subject }}`
- **Message:**
```
No, {{ $('Extract Territory Check Data').item.json.territory_city }}, {{ $('Extract Territory Check Data').item.json.territory_state }} is not available at this time.

Best regards,
The Real FOO Academy
```

### Credentials Required:
- Gmail OAuth2

---

## Node 14: Airtable: Log Inquiry

**Node Type:** `n8n-nodes-base.airtable`
**Type Version:** 2
**Name:** Airtable: Log Inquiry

### Parameters:
```json
{
  "operation": "append",
  "application": "[YOUR_AIRTABLE_BASE_ID]",
  "table": "[YOUR_FRANCHISE_INQUIRIES_TABLE_ID]",
  "options": {
    "fields": {
      "field": [
        {
          "fieldId": "Network",
          "fieldValue": "={{ $('Extract Territory Check Data').item.json.network }}"
        },
        {
          "fieldId": "Consultant Name",
          "fieldValue": "={{ $('Extract Territory Check Data').item.json.consultant_first_name + ' ' + $('Extract Territory Check Data').item.json.consultant_last_name }}"
        },
        {
          "fieldId": "Consultant Email",
          "fieldValue": "={{ $('Extract Territory Check Data').item.json.consultant_email }}"
        },
        {
          "fieldId": "Prospect Name",
          "fieldValue": "={{ $('Extract Territory Check Data').item.json.prospect_first_name + ' ' + $('Extract Territory Check Data').item.json.prospect_last_name }}"
        },
        {
          "fieldId": "City",
          "fieldValue": "={{ $('Extract Territory Check Data').item.json.territory_city }}"
        },
        {
          "fieldId": "State",
          "fieldValue": "={{ $('Extract Territory Check Data').item.json.territory_state }}"
        },
        {
          "fieldId": "Available",
          "fieldValue": "={{ $('Territory Available?').item.json.territoryAvailable ? 'Yes' : 'No' }}"
        }
      ]
    }
  },
  "returnFieldsByFieldId": false
}
```

### UI Configuration:
- **Operation:** Append
- **Base:** [Replace with your Airtable base ID]
- **Table:** [Replace with your Franchise_Inquiries table ID]
- **Options → Fields:** (Add 7 fields)
  1. **Field ID:** `Network`
     **Value:** `={{ $('Extract Territory Check Data').item.json.network }}`
  2. **Field ID:** `Consultant Name`
     **Value:** `={{ $('Extract Territory Check Data').item.json.consultant_first_name + ' ' + $('Extract Territory Check Data').item.json.consultant_last_name }}`
  3. **Field ID:** `Consultant Email`
     **Value:** `={{ $('Extract Territory Check Data').item.json.consultant_email }}`
  4. **Field ID:** `Prospect Name`
     **Value:** `={{ $('Extract Territory Check Data').item.json.prospect_first_name + ' ' + $('Extract Territory Check Data').item.json.prospect_last_name }}`
  5. **Field ID:** `City`
     **Value:** `={{ $('Extract Territory Check Data').item.json.territory_city }}`
  6. **Field ID:** `State`
     **Value:** `={{ $('Extract Territory Check Data').item.json.territory_state }}`
  7. **Field ID:** `Available`
     **Value:** `={{ $('Territory Available?').item.json.territoryAvailable ? 'Yes' : 'No' }}`

### Credentials Required:
- Airtable Personal Access Token

### IDs to Replace:
- `[YOUR_AIRTABLE_BASE_ID]` - From Airtable URL (starts with `app`)
- `[YOUR_FRANCHISE_INQUIRIES_TABLE_ID]` - From Airtable table settings (starts with `tbl`)

### Connection Note:
This node receives TWO inputs:
1. From "Gmail: Reply YES"
2. From "Gmail: Reply NO"

---

## Node 15: Gmail: Add Label

**Node Type:** `n8n-nodes-base.gmail`
**Type Version:** 2
**Name:** Gmail: Add Label

### Parameters:
```json
{
  "resource": "message",
  "operation": "addLabels",
  "messageId": "={{ $('Gmail Trigger').item.json.id }}",
  "labelIds": [
    "[YOUR_TERRITORY_CHECK_LABEL_ID]"
  ]
}
```

### UI Configuration:
- **Resource:** Message
- **Operation:** Add Labels
- **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
- **Label IDs:** [Replace with your Territory Check label ID]

### Credentials Required:
- Gmail OAuth2

### IDs to Replace:
- `[YOUR_TERRITORY_CHECK_LABEL_ID]` - Gmail label ID (or you can use the label name directly like "Territory Check")

---

## Complete Connection Map

```
1. Gmail Trigger
     ↓
2. Extract Territory Check Data
     ↓
3. Is Territory Check?
     ↓ [TRUE branch]
4. Find Consultant
     ↓
5. Consultant Exists?
     ├─ [TRUE] ──────────────┐
     └─ [FALSE] ──→ 6. Create Consultant ──┘
                              ↓
                    7. Add to Consultant List
                              ↓
                    8. Tag: Consultant
                              ↓
                    9. Tag: Territory Check
                              ↓
                    10. Airtable: Territory Lookup
                              ↓
                    11. Territory Available?
                         ├─ [TRUE] ──→ 12. Gmail: Reply YES ──┐
                         └─ [FALSE] ──→ 13. Gmail: Reply NO ───┘
                                             ↓
                                    14. Airtable: Log Inquiry
                                             ↓
                                    15. Gmail: Add Label
```

---

## All IDs You Need to Find

### ActiveCampaign (5 IDs):
1. **Network Custom Field ID** - Settings → Custom Fields → Network → Copy ID from URL
2. **Person Type Custom Field ID** - Settings → Custom Fields → Person Type → Copy ID from URL
3. **Consultant List ID** - Lists → Franchise consultant → Copy ID from URL
4. **Consultant Tag ID** - Tags → Consultant → Copy ID from URL
5. **Territory Check Tag ID** - Tags → Territory Check → Copy ID from URL

### Airtable (3 IDs):
6. **Base ID** - From your Airtable workspace URL (format: `appXXXXXXXXXXXXXX`)
7. **Territories Table ID** - Table settings (format: `tblXXXXXXXXXXXXXX`)
8. **Franchise_Inquiries Table ID** - Table settings (format: `tblXXXXXXXXXXXXXX`)

### Gmail (1 ID):
9. **Territory Check Label ID** - Can use label name "Territory Check" directly or get ID from Gmail API

---

## Credentials Needed

1. **Gmail OAuth2** - Used by: Gmail Trigger, Gmail Reply YES, Gmail Reply NO, Gmail Add Label
2. **ActiveCampaign API** - Used by: Find Consultant, Create Consultant, Add to List, Tag Consultant, Tag Territory Check
3. **Airtable Personal Access Token** - Used by: Territory Lookup, Log Inquiry
4. **OpenAI API** (or compatible) - Used by: Extract Territory Check Data (Information Extractor)

---

## Expression Reference

### Common Patterns Used:

**Access current node's data:**
```javascript
$json.field_name
```

**Access another node's data:**
```javascript
$('Node Name').item.json.field_name
```

**Concatenate strings:**
```javascript
$json.first_name + ' ' + $json.last_name
```

**Conditional (ternary):**
```javascript
$json.condition ? 'Yes' : 'No'
```

**Get email body (fallback):**
```javascript
$json.textPlain || $json.textHtml
```

---

## Testing Tips

1. **Test each section as you build:**
   - Build nodes 1-3, test the trigger and AI extraction
   - Build nodes 4-9, test ActiveCampaign integration
   - Build nodes 10-11, test Airtable lookup
   - Build nodes 12-15, test email replies and logging

2. **Use Execute Node feature:**
   - Right-click any node → "Execute Node"
   - Check the output in the execution panel

3. **Pin test data:**
   - Right-click a node → "Pin Data"
   - Allows testing downstream nodes without re-triggering

4. **Check execution logs:**
   - Click "Executions" tab
   - View detailed logs of what happened at each step

---

## Common Issues

**IF nodes showing "No data":**
- Make sure the previous node executed successfully
- Check that the field name in the condition exists in the data

**ActiveCampaign nodes failing:**
- Verify credentials are configured
- Check that custom field IDs are correct numbers
- Make sure list/tag IDs exist in your ActiveCampaign account

**Airtable nodes failing:**
- Verify base ID and table ID are correct
- Check that field names match exactly (case-sensitive)
- Ensure Airtable token has proper permissions

**Gmail nodes failing:**
- Re-authenticate Gmail OAuth2 if needed
- Check that label IDs are correct
- Verify reply syntax is correct for email threading

---

This reference contains every parameter needed to build the workflow exactly as designed. Copy expressions directly from this document into n8n's UI fields.
