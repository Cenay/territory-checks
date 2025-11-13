# ActiveCampaign Custom Field Access and Update Guide

## Overview
This guide explains how to access and update ActiveCampaign custom field 178 (Territory Checks) in your n8n workflow.

**Current Workflow**: `https://n8n.trfaapi.com/workflow/gZHoQcN5bTwijo4a`

**Related Documentation**:
- `QUICK-START.md` - Quick resume guide for continuing work
- `LESSONS-LEARNED.md` - All issues encountered and solutions
- `RULES.md` - Email parsing rules and patterns
- `javascript-for-code-node.js` - Territory extraction code

## ⚠️ CRITICAL: Field IDs are Strings

**IMPORTANT:** ActiveCampaign API returns field IDs as **strings**, not numbers. Always use string comparison:
- ✅ **CORRECT:** `item.field === "178"`
- ❌ **WRONG:** `item.field === 178`

This is a common gotcha that will cause field lookups to fail silently!

---

## How Custom Fields Work in ActiveCampaign

### API Response Structure (Direct API Call)
When you call the ActiveCampaign API directly using HTTP Request node (`GET /api/3/contacts/{id}/fieldValues`), the response structure is:

```json
{
  "fieldValues": [
    {
      "field": 178,
      "value": "11/03/2025 Woodstock, Savannah, and Macon GA 30188",
      "contact": 11561,
      "cdate": "2025-09-25T15:09:37-05:00",
      "udate": "2025-09-25T15:09:37-05:00"
    },
    {
      "field": 180,
      "value": "Some other value",
      "contact": 11561
    }
  ]
}
```

**Important:** 
- Field values are in an **array**, not as direct properties. You must search the array for the field you need.
- **Field IDs are returned as STRINGS** (e.g., `"178"`), not numbers. Always use string comparison: `item.field === "178"` not `item.field === 178`.

---

## Accessing Field 178 Value

### Method 1: Find Field in Array (Recommended)
After your "Get Custom Fields" HTTP Request node, find field 178 in the array:

**⚠️ IMPORTANT: Field IDs are returned as STRINGS, not numbers!**

```javascript
$json.fieldValues.find(item => item.field === "178")?.value || ''
```

**Breaking it down:**
- `$json.fieldValues` - The array of field values
- `.find(item => item.field === "178")` - Finds the object where `field` equals "178" (string, not number)
- `?.value` - Safely accesses the `value` property (returns undefined if not found)
- `|| ''` - Fallback to empty string if field doesn't exist

**Note:** ActiveCampaign API returns field IDs as strings, so always use `"178"` not `178` in comparisons.

### Method 2: Using Array Index (If You Know Position)
If you know field 178 is always at index 3 (as shown in your example):
```javascript
$json.fieldValues[3]?.value || ''
```

**⚠️ Warning:** Array indices can change, so Method 1 is safer.

### Method 3: From Previous Node
If referencing from a specific node:
```javascript
$('Get Custom Fields').item.json.fieldValues.find(item => item.field === "178")?.value || ''
```

**Remember:** Field IDs are strings, use `"178"` not `178`.

### Method 4: Using Code Node (For Complex Logic)
If you need more complex logic, use a Code node:

```javascript
const fieldValues = $input.item.json.fieldValues || [];
// Field IDs are strings in ActiveCampaign API
const field178 = fieldValues.find(item => item.field === "178");
const existingValue = field178?.value || '';

return {
  json: {
    ...$input.item.json,
    field_178_value: existingValue
  }
};
```

Then access it as: `$json.field_178_value`

**Note:** Always use string comparison `"178"` when working with ActiveCampaign field IDs.

---

## Updating Field 178 with Prepend Logic

### ActiveCampaign Update Contact Node Configuration

**Resource:** `contact`  
**Operation:** `update`  
**Contact ID:** `={{ $json.id }}` (or reference from previous node)

**Update Fields Structure:**
```json
{
  "updateFields": {
    "fieldValues": {
      "fieldValue": [
        {
          "fieldId": "178",
          "fieldValue": "={{ NEW_TERRITORY_CHECK }}\n{{ $json.field_178 || '' }}"
        }
      ]
    }
  }
}
```

### Complete Example Expression

To prepend a new territory check to the existing field 178 value:

```javascript
={{ $('Extract Fields').item.json.territory_requested }} - {{ $now.toFormat('yyyy-MM-dd') }}\n{{ $json.fieldValues.find(item => item.field === 178)?.value || '' }}
```

**Breaking it down:**
- `$('Extract Fields').item.json.territory_requested` - New territory check from your extraction node
- `{{ $now.toFormat('yyyy-MM-dd') }}` - Current date
- `\n` - Newline separator
- `{{ $json.fieldValues.find(item => item.field === 178)?.value || '' }}` - Existing value from fieldValues array (or empty string if none)

### Alternative: Using Territory Requested from Current Data

If the territory is already in the current item's JSON:
```javascript
={{ $json.territory_requested }} - {{ $now.toFormat('yyyy-MM-dd') }}\n{{ $json.fieldValues.find(item => item.field === 178)?.value || '' }}
```

### Alternative: Using Array Index (If Known)
If you know field 178 is always at a specific index:
```javascript
={{ $json.territory_requested }} - {{ $now.toFormat('yyyy-MM-dd') }}\n{{ $json.fieldValues[3]?.value || '' }}
```

---

## Complete Workflow Pattern

### Step 1: Get Custom Fields (HTTP Request)
**Node:** HTTP Request  
**Method:** `GET`  
**URL:** `https://trfa.api-us1.com/api/3/contacts/{{ $json.id }}/fieldValues`  
**Authentication:** ActiveCampaign API credentials

**Output:** Object with `fieldValues` array containing all custom fields, including field 178

### Step 2: Update Contact (Prepend New Value)
**Node:** ActiveCampaign - Update Contact  
**Operation:** `update`  
**Contact ID:** `={{ $json.id }}`

**Field Values Configuration:**
```json
{
  "fieldValues": {
    "fieldValue": [
      {
        "fieldId": "178",
        "fieldValue": "={{ $('Extract Fields').item.json.territory_requested }} - {{ $now.toFormat('yyyy-MM-dd') }}\n{{ $json.fieldValues.find(item => item.field === 178)?.value || '' }}"
      }
    ]
  }
}
```

**Or if referencing from "Get Custom Fields" node:**
```json
{
  "fieldValues": {
    "fieldValue": [
      {
        "fieldId": "178",
        "fieldValue": "={{ $('Extract Fields').item.json.territory_requested }} - {{ $now.toFormat('yyyy-MM-dd') }}\n{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === 178)?.value || '' }}"
      }
    ]
  }
}
```

---

## Important Notes

### Field ID Format
- Use **string** `"178"` not number `178` for fieldId
- ActiveCampaign expects field IDs as strings in the API

### Data Flow
1. **Get Custom Fields** (HTTP Request) → Returns `fieldValues` array with field 178
2. **Extract Fields** → Provides new territory check data
3. **Update Contact** → Combines new + existing values using array search

### Expression Reference
- `$json.fieldValues.find(item => item.field === "178")?.value` - Current item's field 178 value from array
- `$('Get Custom Fields').item.json.fieldValues.find(item => item.field === "178")?.value` - Field 178 from specific node
- `$json.fieldValues[3]?.value` - Field 178 by array index (if position is known)
- `?.value` - Optional chaining to safely access value property
- `|| ''` - Fallback to empty string if field is null/undefined

**⚠️ CRITICAL:** ActiveCampaign API returns field IDs as **strings**, so always use `"178"` (with quotes) not `178` (number) in comparisons.

### Format Example
If field 178 currently contains:
```
Wayne, NJ - 2025-11-03
Atlantic County, NJ - 2025-11-10
```

And you're adding "Woodstock, Savannah, and Macon GA", the result will be:
```
Woodstock, Savannah, and Macon GA - 2025-11-11
Wayne, NJ - 2025-11-03
Atlantic County, NJ - 2025-11-10
```

---

## Troubleshooting

### Field 178 is null/undefined

**Common Issues:**

1. **Field ID Type Mismatch**: ✅ **CONFIRMED** - ActiveCampaign API returns field IDs as **strings**, not numbers. Always use:
   ```javascript
   // ✅ CORRECT - Use string comparison
   $json.fieldValues.find(item => item.field === "178")?.value
   
   // ❌ WRONG - Number comparison won't work
   $json.fieldValues.find(item => item.field === 178)?.value
   ```
   
   **Solution:** Always use `"178"` (with quotes) when comparing field IDs.

2. **Node Name Mismatch**: Verify the exact node name (case-sensitive):
   ```javascript
   // Check what the node actually outputs
   {{ $('Get Custom Fields').item.json }}
   ```

3. **Array Structure**: Verify fieldValues exists and is an array:
   ```javascript
   // Debug: See the full structure
   {{ JSON.stringify($('Get Custom Fields').item.json.fieldValues) }}
   ```

4. **Use Code Node for Robust Access**:
   ```javascript
   const getCustomFields = $('Get Custom Fields').item.json;
   const fieldValues = getCustomFields.fieldValues || [];
   
   // Field IDs are strings in ActiveCampaign API - use "178" not 178
   const field178 = fieldValues.find(item => item.field === "178");
   
   const existingValue = field178?.value || '';
   
   return {
     json: {
       ...$input.item.json,
       field_178_value: existingValue,
       debug_fieldValues: fieldValues,
       debug_field178: field178
     }
   };
   ```

### Update Not Working
- Verify fieldId is string: `"178"` not `178`
- Check Contact ID is correct: `={{ $json.id }}`
- Ensure you're using `updateFields.fieldValues.fieldValue` structure

### Wrong Node Reference
- Use `$('Get Custom Fields').item.json.fieldValues.find(item => item.field === 178)?.value` to reference specific node
- Use `$json.fieldValues.find(item => item.field === 178)?.value` for current item
- Check node names match exactly (case-sensitive)
- Verify the node outputs `fieldValues` array structure

---

## Example: Complete Update Expression

For your workflow at `https://n8n.trfaapi.com/workflow/gZHoQcN5bTwijo4a`:

### Method 1: Direct Expression (Simple Cases) ✅ WORKING SOLUTION

**If "Get Custom Fields" node outputs fieldValues array:**

**✅ CONFIRMED WORKING (Last Verified):**
```javascript
={{ $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}

{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === "178")?.value || '' }}
```

**✅ USING ORIGINAL EMAIL DATE (For Processing Older Emails):**
If you're processing older forwarded emails, use the extracted date from the forwarded message header:
```javascript
={{ $('Extract Fields').item.json.territory_check_date || $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}

{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === "178")?.value || '' }}
```

**Key Points:**
- Field ID must be a **string** `"178"` (with quotes), not number `178` ⚠️ CRITICAL
- Use an actual line break between the two lines (press Enter) instead of `\n` in n8n expressions
- This prepends the new territory check with date, then adds existing value below
- Format: `MM/dd/yyyy Territory Name` on first line, existing entries below
- **For older emails**: `territory_check_date` contains the date from the forwarded message header (formatted as MM/dd/yyyy), or falls back to today's date if not found
- The Extract Fields node now provides:
  - `territory_check_date`: Formatted date (MM/dd/yyyy) from forwarded message, or null if not found
  - `original_email_date`: Original date string from forwarded message header

**Example Output:**
```
11/10/2025 Atlantic County, NJ
11/3/2025 Cedar Rapids, MI
```

**Status**: ✅ This expression was confirmed working after fixing field ID string comparison issue. Date extraction from forwarded messages added for processing older emails.

### Method 2: Code Node (Recommended for Complex Formatting)

Create a Code node before your Update Contact node:

**Code Node:**
```javascript
// Get the new territory check
const extractFields = $('Extract Fields').item.json;
const newTerritory = extractFields.territory_requested;

// Get existing field 178 value - ActiveCampaign returns field IDs as strings
const getCustomFields = $('Get Custom Fields').item.json;
const fieldValues = getCustomFields.fieldValues || [];

// Find field 178 (field IDs are strings in ActiveCampaign API)
const field178 = fieldValues.find(item => item.field === "178");

const existingValue = field178?.value || '';

// Use extracted date from forwarded message, or fall back to today's date
let formattedDate;
if (extractFields.territory_check_date) {
  // Use date from forwarded message header (already formatted as MM/dd/yyyy)
  formattedDate = extractFields.territory_check_date;
} else {
  // Fallback to today's date
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  formattedDate = `${month}/${day}/${year}`;
}

// Build the new value: new check on top, existing below
const newValue = existingValue 
  ? `${formattedDate} ${newTerritory}\n${existingValue}`
  : `${formattedDate} ${newTerritory}`;

return {
  json: {
    ...$input.item.json,
    field_178_new_value: newValue,
    // Debug fields (remove after confirming it works)
    debug_fieldValues_count: fieldValues.length,
    debug_field178_found: !!field178,
    debug_field178_value: existingValue
  }
};
```

Then in your Update Contact node, use:
```javascript
={{ $json.field_178_new_value }}
```

### Method 3: Using Luxon Date Formatting (If Available)

If your n8n version supports Luxon's `toFormat`:
```javascript
={{ $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}
{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === 178)?.value || '' }}
```

**Important:** Make sure there's an actual line break (press Enter) between the two lines in the expression editor, not `\n`.

---

## Related Files
- See `archive/territory-check-workflow-FINAL.json` for complete workflow examples
- See `docs/javascript-for-code-node.js` for territory extraction logic
- See `docs/LESSONS-LEARNED.md` for all issues encountered and debugging history
- See `docs/RULES.md` for email parsing rules and patterns

## Accessing Field 180 (Current Territory Check)

Field 180 may not appear in n8n's UI dropdown, but you can access it via API expressions using the same pattern as field 178.

### Reading Field 180 Value

**After your "Get Custom Fields" HTTP Request node:**

```javascript
$json.fieldValues.find(item => item.field === "180")?.value || ''
```

**From a specific node:**
```javascript
$('Get Custom Fields').item.json.fieldValues.find(item => item.field === "180")?.value || ''
```

**⚠️ Remember:** Field IDs are strings, use `"180"` not `180`.

### Updating Field 180 (Current Territory Check)

Unlike field 178 (which prepends to history with dates), field 180 should be **replaced** with just the current territory name (no date).

**In ActiveCampaign Update Contact node:**

**Field Values Configuration:**
```json
{
  "fieldValues": {
    "fieldValue": [
      {
        "fieldId": "180",
        "fieldValue": "={{ $('Extract Fields').item.json.territory_requested }}"
      }
    ]
  }
}
```

**Complete expression (territory only, no date):**
```javascript
={{ $('Extract Fields').item.json.territory_requested }}
```

**Or if territory is in current item:**
```javascript
={{ $json.territory_requested }}
```

**Example Output:**
```
Woodstock, Savannah, and Macon GA
```

**Note:** Field 180 contains only the territory name, without date formatting.

### Updating Both Fields 178 and 180 Together

You can update both fields in a single Update Contact node:

```json
{
  "fieldValues": {
    "fieldValue": [
      {
        "fieldId": "178",
        "fieldValue": "={{ $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}\n{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === \"178\")?.value || '' }}"
      },
      {
        "fieldId": "180",
        "fieldValue": "={{ $('Extract Fields').item.json.territory_requested }}"
      }
    ]
  }
}
```

**Key Differences:**
- **Field 178** (`Territory Checks`): Prepend new check with date to history (multi-line format: `MM/dd/yyyy Territory Name`)
- **Field 180** (`Current Territory Check`): Replace with current territory name only (no date, single value)

---

---

## Adding Contacts to Lists

### ⚠️ CRITICAL: List-Specific Fields

**IMPORTANT:** Some custom fields (like field 178) are **list-specific** and only available when the contact is on specific lists. 

**Field 178** requires the contact to be on:
- **List 39** (Franchise Consultants)
- **List 40** (Second list)

**You MUST add contacts to these lists BEFORE updating field 178**, or the update will fail.

### Workflow Order for New Contacts

When creating a new consultant contact, follow this order:

```
1. Create Contact (without field 178)
   ↓
2. Add to Lists (39 & 40)
   ↓
3. Update Field 178 (now accessible)
   ↓
4. Create Note (optional)
```

### Node Configuration: Add to Lists

**Node Type:** `n8n-nodes-base.activeCampaign`  
**Resource:** `contact`  
**Operation:** `update`

**Single Node (Adds to Both Lists):**
```json
{
  "resource": "contact",
  "operation": "update",
  "contactId": "={{ $json.id }}",
  "updateFields": {
    "lists": {
      "list": [
        {
          "list": "39",
          "status": "1"
        },
        {
          "list": "40",
          "status": "1"
        }
      ]
    }
  }
}
```

**Alternative: Two Separate Nodes**
If the single update doesn't work, use two "Contact List" → "Add" nodes:

**Node 1: Add to List 39**
```json
{
  "resource": "contactList",
  "operation": "add",
  "listId": "39",
  "contactId": "={{ $json.id }}"
}
```

**Node 2: Add to List 40**
```json
{
  "resource": "contactList",
  "operation": "add",
  "listId": "40",
  "contactId": "={{ $json.id }}"
}
```

### Create Contact Node (Updated)

**Remove field 178** from the create node - it will fail if contact isn't on the list yet:

```json
{
  "email": "={{ $('Extract Fields').item.json.consultant_email }}",
  "additionalFields": {
    "fieldValues": {
      "property": [
        {
          "field": "179",
          "value": "={{ $('Extract Fields').item.json.consultant_company }}"
        },
        {
          "field": "45",
          "value": "Consultant"
        },
        {
          "field": "180",
          "value": "={{ $('Extract Fields').item.json.territory_requested }}"
        }
      ]
    },
    "firstName": "={{ $('Extract Fields').item.json.consultant_first_name }}",
    "lastName": "={{ $('Extract Fields').item.json.consultant_last_name }}",
    "phone": "={{ $('Extract Fields').item.json.consultant_phone }}"
  }
}
```

---

## Creating Notes in ActiveCampaign

### Overview

Create notes in ActiveCampaign with territory check information using the same date/territory format as field 178.

**⚠️ IMPORTANT:** The ActiveCampaign node in n8n does **not** have a "note" resource. You must use an **HTTP Request** node to call the ActiveCampaign API directly.

### Node Configuration

**Node Type:** `n8n-nodes-base.httpRequest`  
**Method:** `POST`  
**URL:** `https://YOUR_ACCOUNT.api-us1.com/api/3/notes`  
*(Replace `YOUR_ACCOUNT.api-us1.com` with your ActiveCampaign API URL)*

**Authentication:**
- **Type:** Header Auth
- **Name:** `Api-Token`
- **Value:** `YOUR_ACTIVECAMPAIGN_API_KEY`

**Headers (Important!):**
- **Content-Type:** `application/json`
- **Api-Token:** `YOUR_ACTIVECAMPAIGN_API_KEY`

**Body:**
- **Body Content Type:** JSON
- **JSON Body:**
```json
{
  "note": {
    "note": "{{ $('Extract Fields').item.json.territory_check_date || $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}",
    "reltype": "Subscriber",
    "relid": "{{ String($('Create a contact').item.json.id) }}"
  }
}
```

**⚠️ CRITICAL:** 
- **NO `=` sign in expressions** - When "Specify Body" is set to "Using JSON", use `{{ }}` without `=`
- `reltype` must be `"Subscriber"` (not `"contact"`) - ActiveCampaign API uses "Subscriber" for contacts
- `relid` must be a **string** - use `String($json.id)` or `String($('Create a contact').item.json.id)` to ensure it's converted
- For new contacts, use `$('Create a contact').item.json.id` to reference the contact ID from creation
- Make sure `Content-Type: application/json` header is included
- The `Api-Token` header is required (in addition to authentication)

### Complete Node Configuration (JSON)

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://YOUR_ACCOUNT.api-us1.com/api/3/notes",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Api-Token",
          "value": "=YOUR_ACTIVECAMPAIGN_API_KEY"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": []
    },
    "specifyBody": "json",
    "jsonBody": "={\n  \"note\": {\n    \"note\": \"{{ $('Extract Fields').item.json.territory_check_date || $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}\",\n    \"reltype\": \"contact\",\n    \"relid\": \"{{ $json.id }}\"\n  }\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1
}
```

### Note Format

The note will contain: `11/10/2025 Atlantic County, NJ` (matches field 178 format)

- Uses extracted date from forwarded email if available
- Falls back to current date if extraction fails
- Same format as field 178 for consistency

### API Endpoint Details

**Endpoint:** `POST /api/3/notes`

**Request Body Structure:**
- `note.note`: The note text content
- `note.reltype`: Relationship type - must be `"Subscriber"` for contact notes (ActiveCampaign API uses "Subscriber" not "contact")
- `note.relid`: The contact ID (from previous node's `$json.id`)

**Response:**
```json
{
  "note": {
    "id": "12345",
    "note": "11/10/2025 Atlantic County, NJ",
    "reltype": "contact",
    "relid": "11561",
    "cdate": "2025-11-13T10:30:00-05:00"
  }
}
```

### Placement

Add the HTTP Request node **after** updating field 178 in both workflow paths:
- **Existing contacts:** After "Update a contact" node
- **New contacts:** After "Update Field 178" node

**Important:** The node expects `$json.id` to contain the contact ID from the previous ActiveCampaign node.

**⚠️ For New Contacts:** If you're getting "contact_not_exist" error, use the contact ID from the "Create a contact" node instead:
- Use `$('Create a contact').item.json.id` instead of `$json.id`
- Or ensure you're referencing the correct node that contains the contact ID

### Troubleshooting 400 Bad Request Error

If you get a "400 Bad Request" error, check these common issues:

1. **HTTP Method must be POST (not GET):**
   - **CRITICAL:** Check the console/logs - if you see `method: "GET"`, the method is wrong
   - In n8n HTTP Request node, explicitly set **Method:** `POST`
   - Even when using ActiveCampaign credentials, you must manually set the method
   - GET requests cannot send a body, which causes the error

2. **reltype must be "Subscriber" (not "contact"):**
   - ActiveCampaign API uses `"Subscriber"` for contacts, not `"contact"`
   - Valid values: `Deal`, `Subscriber`, `DealTask`, `Activity`, `CustomerAccount`
   - Error: "reltype must be one of Deal, Subscriber, DealTask, Activity, CustomerAccount"

3. **Contact ID must exist and be correct:**
   - **Error "contact_not_exist"**: The contact ID doesn't exist or is wrong
   - For new contacts, use `$('Create a contact').item.json.id` instead of `$json.id`
   - Verify the contact ID exists by checking the previous node's output
   - Use `String($json.id)` or `String($('Create a contact').item.json.id)` to ensure it's a string
   - ActiveCampaign API requires `relid` as a string, not a number

3. **Content-Type header required:**
   - Add `Content-Type: application/json` to headers
   - This is separate from the authentication header

4. **Correct JSON body format:**
   - Ensure the body is properly formatted JSON
   - Use n8n's JSON body editor, not raw text

5. **Verify contact ID exists:**
   - Check that `$json.id` from previous node contains a valid contact ID
   - Test by logging the value: `{{ $json.id }}`

6. **API URL format:**
   - Must be: `https://YOUR_ACCOUNT.api-us1.com/api/3/notes`
   - Replace `YOUR_ACCOUNT` with your actual account subdomain
   - No trailing slash

### Step-by-Step n8n Configuration

1. **Add HTTP Request Node**
   - Method: `POST`
   - URL: `https://YOUR_ACCOUNT.api-us1.com/api/3/notes`

2. **Set Headers** (in "Headers" section):
   - Click "Add Header"
   - Name: `Content-Type`
   - Value: `application/json`
   - Click "Add Header" again
   - Name: `Api-Token`
   - Value: `YOUR_ACTIVECAMPAIGN_API_KEY`

3. **Set Authentication** (in "Authentication" section):
   - Type: `Header Auth`
   - Name: `Api-Token`
   - Value: `YOUR_ACTIVECAMPAIGN_API_KEY`
   *(Note: You may need both header and authentication, or just authentication - test both)*

4. **Set Body** (in "Body" section):
   - Body Content Type: `JSON`
   - JSON Body:
   ```json
   {
     "note": {
       "note": "{{ $('Extract Fields').item.json.territory_check_date || $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}",
       "reltype": "Subscriber",
       "relid": "{{ String($('Create a contact').item.json.id) }}"
     }
   }
   ```
   
   **⚠️ CRITICAL:** 
   - **NO `=` sign** - When "Specify Body" is "Using JSON", expressions use `{{ }}` without `=`
   - For new contacts, use `$('Create a contact').item.json.id` to reference the contact ID from creation
   - For existing contacts, use `$json.id` from the update node

5. **Options Section** (Important!):
   - **Enable "Full Response"** to see detailed error messages
   - **Check for "Send Body as JSON" or similar option** - This should be enabled automatically when Body Content Type is JSON, but verify it's checked
   - If there's a "JSON" toggle or checkbox, make sure it's enabled

**⚠️ If `json: false` appears in console:**
- The body might not be serializing as JSON
- Try using a Code node to format the body first, then reference it
- Or try using "Specify Body" → "Using JSON" with explicit JSON formatting

### Alternative Solution: Code Node + HTTP Request

If the HTTP Request node isn't properly serializing JSON (shows `json: false` in console), use a Code node to format the body first:

**Step 1: Add Code Node Before HTTP Request**
```javascript
const contactId = $input.item.json.id;
const extractFields = $('Extract Fields').item.json;

const noteText = `${extractFields.territory_check_date || $now.toFormat('MM/dd/yyyy')} ${extractFields.territory_requested}`;

const noteBody = {
  note: {
    note: noteText,
    reltype: "Subscriber",
    relid: String(contactId)
  }
};

return {
  json: {
    contactId: contactId,
    noteBody: noteBody
  }
};
```

**Step 2: HTTP Request Node Configuration**
- Method: `POST`
- URL: `https://trfa.api-us1.com/api/3/notes`
- Authentication: ActiveCampaign (API) credentials
- Headers: `Content-Type: application/json`
- Body Content Type: `JSON`
- JSON Body: `={{ $json.noteBody }}`

This ensures the body is properly formatted before sending.

---

### Alternative: Using ActiveCampaign Credentials

If you have ActiveCampaign credentials configured in n8n, you can reference them in the HTTP Request node:
- Use the same credentials as your other ActiveCampaign nodes
- The API URL and token will be automatically included
- Still ensure `relid` is converted to string: `String($json.id)`

**⚠️ CRITICAL WHEN USING CREDENTIALS:**
- **You MUST manually set Method to POST** - credentials don't set the HTTP method
- Even if using credentials, explicitly set:
  - **Method:** `POST` (in the main node settings)
  - **URL:** `https://trfa.api-us1.com/api/3/notes` (or your account URL)
- The credentials will handle authentication, but you still need to set method and URL

---

## Date Extraction from Forwarded Emails

### Overview

The Extract Fields node now extracts the date from forwarded email headers and formats it for use in field 178 and notes.

### Extracted Fields

The Extract Fields node provides:
- `territory_check_date`: Formatted date (MM/dd/yyyy) from forwarded message, or `null` if not found
- `original_email_date`: Original date string from forwarded message header (e.g., "Mon, 10 Nov 2025 14:56:03 +0000")

### Debug Fields

Check extraction status:
- `extraction_notes.date_extracted`: `true` if date was found, `false` otherwise
- `extraction_notes.original_date_string`: Raw date string if found

### Date Format Patterns

The extraction handles multiple formats:
- `Date:Mon, 03 Nov 2025 20:52:26 +0000` (no space after colon) - PRIMARY FORMAT
- `Date: Mon, 10 Nov 2025 14:56:03 +0000` (space after colon)
- `AcademyDate: Mon, 10 Nov 2025 14:56:03 +0000` (attached to previous word)

### Usage in Expressions

Always use with fallback to current date:
```javascript
={{ $('Extract Fields').item.json.territory_check_date || $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}
```

---

## Current Status

**Last Updated**: After adding date extraction, list-specific fields handling, and note creation

**Current Task**: All territory check workflow features working correctly

**Known Issues**: 
- Field 180 doesn't appear in n8n UI dropdown but accessible via API expressions
- Field 178 requires contact to be on lists 39 and 40 before updating

**List IDs**:
- Franchise Consultants: **39**
- Second List: **40**

**Next Steps**: 
- Monitor workflow in production
- Document any edge cases discovered

