# Territory Check Workflow - Manual Build Plan

Since automated import is failing, here's a step-by-step manual build plan using n8n's UI.

## Step 1: Start with Working Template

1. Open your n8n instance
2. Import `tchecks-first-draft.json` (we know this works)
3. Save it as a new workflow "Territory Check V2"
4. We'll modify this working workflow piece by piece

## Step 2: Replace Email Parsing

The first draft uses Code node with regex. New requirements use AI extraction.

**Replace:**
- Delete "Parse Email - Extract Fields" Code node

**Add:**
- Information Extractor node
- Configure with the 13 attributes we defined
- Connect Gmail Trigger → Information Extractor → IF node

## Step 3: Add ActiveCampaign Integration

**After the classification IF node, add:**

1. **Find Consultant** (ActiveCampaign node)
   - Resource: Contact
   - Operation: Get All
   - Options → Email: `={{ $json.consultant_email }}`
   - Limit: 1
   - Continue on Fail: true

2. **IF: Consultant Exists?**
   - Check if results returned

3. **Create Consultant** (ActiveCampaign - if new)
   - Resource: Contact
   - Operation: Create
   - Email, First Name, Last Name, Phone from extracted data
   - Custom fields: Network, Person Type

4. **Add to List** (ActiveCampaign)
   - Resource: Contact List
   - Operation: Add

5. **Add Tags** (2 x ActiveCampaign nodes)
   - Resource: Contact Tag
   - Operation: Add
   - Tag IDs for "Consultant" and "Territory Check"

6. **Update Territory Fields** (ActiveCampaign)
   - Resource: Contact
   - Operation: Update
   - Update custom fields: Territory Checks, Current Territory Check

## Step 4: Keep Existing Airtable & Gmail Logic

The working template already has:
- ✅ Territory lookup (replace placeholder with Airtable)
- ✅ YES/NO email replies
- ✅ Airtable logging
- ✅ Gmail labeling

**Modify:**
- Replace "Territory Lookup - Placeholder" Code node with Airtable Search node
- Update Airtable logging to include consultant details

## Step 5: Configuration Checklist

Before activating:

- [ ] Gmail OAuth credentials configured
- [ ] ActiveCampaign API credentials configured
- [ ] Airtable token configured
- [ ] OpenAI/LLM credentials for Information Extractor
- [ ] ActiveCampaign field IDs updated
- [ ] ActiveCampaign list ID updated
- [ ] ActiveCampaign tag IDs updated
- [ ] Airtable base and table IDs updated
- [ ] Gmail labels created

---

## Alternative: Export Individual Nodes

If manual rebuild is too tedious, we can:

1. Create each node type individually in n8n
2. Export each working node
3. Copy the exact JSON structure
4. Build the full workflow by copying working node structures

Would you prefer this approach instead?

---

## What We Learned

**The "Could not find property option" error is likely caused by:**
- Version mismatches between how we generate JSON vs what n8n expects
- Some nodes have hidden/internal properties that only appear when created in UI
- The import validation is stricter than individual node validation

**Workaround:**
Start with a known-working workflow and modify it, rather than building from scratch.
