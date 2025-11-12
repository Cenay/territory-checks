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

**Key Points:**
- Field ID must be a **string** `"178"` (with quotes), not number `178` ⚠️ CRITICAL
- Use an actual line break between the two lines (press Enter) instead of `\n` in n8n expressions
- This prepends the new territory check with date, then adds existing value below
- Format: `MM/dd/yyyy Territory Name` on first line, existing entries below

**Example Output:**
```
11/11/2025 Woodstock, Savannah, and Macon GA
11/3/2025 Cedar Rapids, MI
```

**Status**: ✅ This expression was confirmed working after fixing field ID string comparison issue.

### Method 2: Code Node (Recommended for Complex Formatting)

Create a Code node before your Update Contact node:

**Code Node:**
```javascript
// Get the new territory check
const newTerritory = $('Extract Fields').item.json.territory_requested;

// Get existing field 178 value - ActiveCampaign returns field IDs as strings
const getCustomFields = $('Get Custom Fields').item.json;
const fieldValues = getCustomFields.fieldValues || [];

// Find field 178 (field IDs are strings in ActiveCampaign API)
const field178 = fieldValues.find(item => item.field === "178");

const existingValue = field178?.value || '';

// Format date as MM/dd/yyyy
const today = new Date();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const year = today.getFullYear();
const formattedDate = `${month}/${day}/${year}`;

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

## Current Status

**Last Updated**: After adding field 180 (Current Territory Check) access guide

**Current Task**: Territory check field updates working correctly with prepend logic

**Known Issues**: Field 180 doesn't appear in n8n UI dropdown, but accessible via API expressions

**Next Steps**: 
- Monitor field updates in production
- Consider adding Code node for more complex formatting if needed
- Document any edge cases discovered in production

