# Quick Start Guide - Resuming Work

This guide helps you quickly resume work on the territory checks workflow.

## Current Status

**Workflow URL**: `https://n8n.trfaapi.com/workflow/gZHoQcN5bTwijo4a`

**Last Completed Task**: ActiveCampaign fields 178 and 180 update expressions working correctly

**Status**: ✅ All known issues resolved

---

## Essential Documents (Read First)

1. **LESSONS-LEARNED.md** - All issues, solutions, and rabbit holes
2. **ACTIVECAMPAIGN-FIELD-GUIDE.md** - ActiveCampaign field access (includes working expression)
3. **RULES.md** - Email parsing rules and patterns

---

## Quick Reference

### Working ActiveCampaign Field Update Expressions

**Field 178 (Territory Checks - History):**
```javascript
={{ $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}

{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === "178")?.value || '' }}
```

**Field 180 (Current Territory Check - No Date):**
```javascript
={{ $('Extract Fields').item.json.territory_requested }}
```

**Critical**: 
- Field IDs must be strings: `"178"` and `"180"` not numbers
- Field 178 includes date, Field 180 is territory name only
- Field 180 may not appear in n8n UI dropdown but works via API expressions

### Key Files

- **Parsing Code**: `docs/javascript-for-code-node.js`
- **Sample Data**: `docs/*-json-from-gmail.json`
- **Workflow Examples**: `archive/territory-check-workflow-FINAL.json`

---

## Critical Gotchas (Don't Forget!)

1. ⚠️ **ActiveCampaign field IDs are strings** - Use `"178"` and `"180"` not numbers
2. ⚠️ **Field 178 vs 180** - Field 178 includes date, Field 180 is territory name only
3. ⚠️ **Field 180 UI limitation** - May not appear in n8n dropdown but accessible via API expressions
4. ⚠️ **Forwarded emails** - Check body first, not headers
5. ⚠️ **Regex patterns** - Use non-greedy `+?` with explicit boundaries
6. ⚠️ **n8n expressions** - Use actual line breaks, not `\n`
7. ⚠️ **Gmail trigger** - Manual test returns 1 email (expected behavior)

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
4. Note: Field 180 may not appear in n8n UI dropdown but works via API expressions

### Add New Network Format
1. Add network detection logic
2. Add network-specific extraction patterns
3. Update `RULES.md` with new rules
4. Test with sample emails

---

## Testing Checklist

- [ ] Test with real email samples from each network
- [ ] Verify ActiveCampaign field 178 updates work (with date)
- [ ] Verify ActiveCampaign field 180 updates work (territory only, no date)
- [ ] Check prospect name splitting works
- [ ] Verify forwarded email extraction
- [ ] Test edge cases (missing fields, unusual formatting)

---

## Need Help?

1. Check `LESSONS-LEARNED.md` for similar issues
2. Review `RULES.md` for technical patterns
3. Check `ACTIVECAMPAIGN-FIELD-GUIDE.md` for field access
4. Look at sample data in `/docs/*-json-from-gmail.json`

---

**Last Updated**: After adding field 180 (Current Territory Check) support

