# Quick Start Guide - Resuming Work

This guide helps you quickly resume work on the territory checks workflow.

## Current Status

**Workflow URL**: `https://n8n.trfaapi.com/workflow/gZHoQcN5bTwijo4a`

**Last Completed Task**: ActiveCampaign field 178 update expression working correctly

**Status**: ✅ All known issues resolved

---

## Essential Documents (Read First)

1. **LESSONS-LEARNED.md** - All issues, solutions, and rabbit holes
2. **ACTIVECAMPAIGN-FIELD-GUIDE.md** - ActiveCampaign field access (includes working expression)
3. **RULES.md** - Email parsing rules and patterns

---

## Quick Reference

### Working ActiveCampaign Field Update Expression

```javascript
={{ $now.toFormat('MM/dd/yyyy') }} {{ $('Extract Fields').item.json.territory_requested }}

{{ $('Get Custom Fields').item.json.fieldValues.find(item => item.field === "178")?.value || '' }}
```

**Critical**: Field ID must be string `"178"` not number `178`

### Key Files

- **Parsing Code**: `docs/javascript-for-code-node.js`
- **Sample Data**: `docs/*-json-from-gmail.json`
- **Workflow Examples**: `archive/territory-check-workflow-FINAL.json`

---

## Critical Gotchas (Don't Forget!)

1. ⚠️ **ActiveCampaign field IDs are strings** - Use `"178"` not `178`
2. ⚠️ **Forwarded emails** - Check body first, not headers
3. ⚠️ **Regex patterns** - Use non-greedy `+?` with explicit boundaries
4. ⚠️ **n8n expressions** - Use actual line breaks, not `\n`
5. ⚠️ **Gmail trigger** - Manual test returns 1 email (expected behavior)

---

## Common Tasks

### Update Territory Extraction
1. Review `RULES.md` network-specific rules
2. Modify `docs/javascript-for-code-node.js`
3. Test with sample emails from `/docs/`

### Fix ActiveCampaign Field Access
1. Check `ACTIVECAMPAIGN-FIELD-GUIDE.md` for working expression
2. Verify field ID is string `"178"`
3. Check node names match exactly (case-sensitive)

### Add New Network Format
1. Add network detection logic
2. Add network-specific extraction patterns
3. Update `RULES.md` with new rules
4. Test with sample emails

---

## Testing Checklist

- [ ] Test with real email samples from each network
- [ ] Verify ActiveCampaign field updates work
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

**Last Updated**: After ActiveCampaign field ID string discovery

