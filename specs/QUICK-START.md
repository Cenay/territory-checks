# Quick Start Guide - Resuming Work

This guide helps you quickly resume work on the territory checks workflow.

## Current Status

**Workflow URL**: `https://n8n.trfaapi.com/workflow/gZHoQcN5bTwijo4a`

**Last Completed Task**: Date extraction from forwarded emails, list-specific fields handling, and note creation implemented

**Status**: ✅ All known issues resolved

---

## Essential Documents (Read First)

1. **LESSONS-LEARNED.md** - All issues, solutions, and rabbit holes
2. **ACTIVECAMPAIGN-FIELD-GUIDE.md** - ActiveCampaign field access (includes working expression)
3. **MARK-EMAIL-READ-AND-ADD-TAG.md** - Guide for marking emails as read and adding tags
4. **RULES.md** - Email parsing rules and patterns

---

## Quick Reference

### Working ActiveCampaign Field Update Expressions

**Field 178 (Territory Checks - History) - Uses Extracted Date:**
```javascript
={{ $('Extract Fields').item.json.territory_check_date || $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}

{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === "178")?.value || '' }}
```

**Field 180 (Current Territory Check - No Date):**
```javascript
={{ $('Extract Fields').item.json.territory_requested }}
```

**Note Creation (HTTP Request Node - Same Format as Field 178):**
- **Node Type:** HTTP Request
- **Method:** POST
- **URL:** `https://YOUR_ACCOUNT.api-us1.com/api/3/notes`
- **Headers:** `Content-Type: application/json`, `Api-Token: YOUR_API_KEY`
- **Auth:** Header Auth with `Api-Token` = your API key
- **Body (JSON):**
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
- **NO `=` sign in expressions** - When "Using JSON", use `{{ }}` without `=`
- Use `reltype: "Subscriber"` (not "contact") - ActiveCampaign API uses "Subscriber" for contacts
- Use `String($('Create a contact').item.json.id)` for new contacts - relid must be a string!

**Critical**: 
- Field IDs must be strings: `"178"` and `"180"` not numbers
- Field 178 includes date (extracted from forwarded email or current date), Field 180 is territory name only
- Field 180 may not appear in n8n UI dropdown but works via API expressions
- **Field 178 is list-specific** - contact must be on lists 39 & 40 before updating
- Date extraction: `territory_check_date` contains MM/dd/yyyy format from forwarded email header

### Key Files

- **Parsing Code**: `docs/javascript-for-code-node.js`
- **Sample Data**: `docs/*-json-from-gmail.json`
- **Workflow Examples**: `archive/territory-check-workflow-FINAL.json`

---

## Critical Gotchas (Don't Forget!)

1. ⚠️ **ActiveCampaign field IDs are strings** - Use `"178"` and `"180"` not numbers
2. ⚠️ **Field 178 vs 180** - Field 178 includes date (extracted or current), Field 180 is territory name only
3. ⚠️ **Field 180 UI limitation** - May not appear in n8n dropdown but accessible via API expressions
4. ⚠️ **Field 178 is list-specific** - Contact MUST be on lists 39 & 40 BEFORE updating field 178
5. ⚠️ **Workflow order for new contacts** - Create → Add to Lists → Update Field 178 → Create Note
6. ⚠️ **Date extraction** - Uses `territory_check_date` from forwarded email header, falls back to current date
7. ⚠️ **Forwarded emails** - Check body first, not headers
8. ⚠️ **Date format in forwarded emails** - May be "Date:Mon" (no space) not "Date: Mon"
9. ⚠️ **Regex patterns** - Use non-greedy `+?` with explicit boundaries
10. ⚠️ **n8n expressions** - Use actual line breaks, not `\n`
11. ⚠️ **Gmail trigger** - Manual test returns 1 email (expected behavior)
12. ⚠️ **List IDs** - Franchise Consultants = 39, Second list = 40
13. ⚠️ **Note creation** - ActiveCampaign node doesn't support notes - must use HTTP Request node with `/api/3/notes` endpoint
14. ⚠️ **HTTP Request method** - MUST be POST (not GET) - even when using ActiveCampaign credentials, manually set Method to POST
15. ⚠️ **JSON body expressions** - When "Using JSON", use `{{ }}` WITHOUT `=` sign - `=` is only for direct expression fields
16. ⚠️ **Mark emails as read** - Add Gmail node with `addLabels` or `modifyMessage` to prevent reprocessing
17. ⚠️ **Contact tags** - Use ActiveCampaign `contactTag` resource or HTTP Request to `/api/3/contactTags` - tags auto-create if missing

---

## Common Tasks

### Update Territory Extraction
1. Review `RULES.md` network-specific rules
2. Modify `docs/javascript-for-code-node.js`
3. Test with sample emails from `/docs/`

### Fix ActiveCampaign Field Access
1. Check `ACTIVECAMPAIGN-FIELD-GUIDE.md` for working expressions
2. Verify field IDs are strings: `"178"` and `"180"` not numbers
3. Check node names match exactly (case-sensitive)
4. **For new contacts**: Ensure contact is added to lists 39 & 40 BEFORE updating field 178
5. Note: Field 180 may not appear in n8n UI dropdown but works via API expressions
6. **Date extraction**: Check `extraction_notes.date_extracted` to verify date was found

### Add New Network Format
1. Add network detection logic
2. Add network-specific extraction patterns
3. Update `RULES.md` with new rules
4. Test with sample emails

---

## Testing Checklist

- [ ] Test with real email samples from each network
- [ ] Verify ActiveCampaign field 178 updates work (with extracted date)
- [ ] Verify ActiveCampaign field 180 updates work (territory only, no date)
- [ ] **For new contacts**: Verify contact added to lists 39 & 40 before field 178 update
- [ ] **Date extraction**: Verify `territory_check_date` extracted from forwarded emails
- [ ] **Notes**: Verify notes created with correct date/territory format
- [ ] **Tags**: Verify tags added to contacts (check ActiveCampaign)
- [ ] **Email status**: Verify emails marked as read (or have processed label)
- [ ] **No reprocessing**: Verify processed emails don't get reprocessed
- [ ] Check prospect name splitting works
- [ ] Verify forwarded email extraction (Reply-To, date)
- [ ] Test edge cases (missing fields, unusual formatting)
- [ ] Test with older forwarded emails to verify date extraction

---

## Need Help?

1. Check `LESSONS-LEARNED.md` for similar issues
2. Review `RULES.md` for technical patterns
3. Check `ACTIVECAMPAIGN-FIELD-GUIDE.md` for field access
4. Look at sample data in `/docs/*-json-from-gmail.json`

---

**Last Updated**: After adding mark email as read and add tag functionality

**Key Updates**:
- Date extraction from forwarded email headers
- List-specific field handling (add to lists before updating field 178)
- Note creation with same format as field 178
- Mark emails as read to prevent reprocessing
- Add tags to contacts for organization
- List IDs: 39 (Franchise Consultants), 40 (Second list)

