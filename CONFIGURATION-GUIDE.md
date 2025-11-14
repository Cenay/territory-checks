# Territory Check Workflow - Configuration Guide

## Overview

This n8n workflow automates the processing of territory check requests from franchise consultants across multiple networks (IFPG, FranServe, FBA, and direct forms).

## Workflow Flow

1. **Gmail Trigger** - Monitors inbox for new unread emails
2. **Extract Fields** - Uses JavaScript Code node with network-specific regex patterns to extract and classify email data:
   - Detects network (IFPG, FranServe, FBA, TYN, Direct Form)
   - Extracts consultant info (name, email, phone, company)
   - Extracts prospect info (name, email, city, state, zip)
   - Extracts territory details
   - Extracts date from forwarded message headers
   - Validates all required fields
3. **Is Territory Check** - Routes only territory check emails (stops processing if not a territory check)
4. **Find Consultant** - Searches ActiveCampaign for existing consultant by email
5. **Consultant Exists Check** - Branches based on whether consultant was found:
   - **If NEW consultant:**
     - Creates consultant contact in ActiveCampaign
     - Sets First Name, Last Name, Email, Phone
     - Sets Company field (IFPG, FranServe, FBA, TYN, or Direct)
     - Adds to "Franchise Consultants" list (List 39 & 40)
   - **If EXISTING consultant:**
     - Skips creation and list additions
6. **Update Territory Fields** - Updates consultant record with:
   - Appends to "Territory Checks" field (Field 178) with date + territory
   - Updates "Current Territory Check" field (Field 180) with territory only
   - Creates note with same date/territory format
7. **Add Tags** - Adds tags to contact for organization
8. **Mark Email as Read** - Applies label or mark status to prevent reprocessing
9. **(Optional) Response/Logging** - Future: Territory lookup, response generation, Airtable logging

## Pre-Deployment Configuration

### 1. Gmail Setup

**Node:** Gmail Trigger

**Steps:**
1. Configure Gmail OAuth2 credentials in n8n
2. Set the email address or filter for monitoring
3. Optional: Add label filter to only process specific labeled emails
4. Optional: Set polling interval (default is suitable)

**Parameters to Configure:**
- `filters.labelIds`: Optional - only process emails with specific labels
- `filters.sender`: Optional - only process emails from specific senders

---

### 2. Extract Fields (Code Node) Setup

**Node:** Extract Fields

**Type:** JavaScript Code Node (deterministic extraction, no AI required)

**What it extracts:**
- `network` - IFPG, FranServe, FBA, TYN, or Direct Form
- `is_territory_check` - Boolean classification
- Consultant details: name, first_name, last_name, email, phone, company
- Prospect details: name, first_name, last_name, email, city, state, zip
- Territory: city, state, zip, full territory description
- Dates: original email date, formatted territory check date (MM/dd/yyyy)
- Validation: allFieldsValid, missingFields array, error notes
- Debug info: extraction notes with source tracking

**Configuration:**
- The code is embedded in the workflow node
- Uses network-specific regex patterns to handle 5 different email formats
- No external credentials required
- See `/specs/RULES.md` for detailed extraction patterns and logic
- See `/docs/javascript-for-code-node.js` for the complete source code

---

### 3. ActiveCampaign Setup

You need to configure the following ActiveCampaign IDs and API credentials:

#### a. Custom Field IDs

**Current implementation uses:**
- **Field 178** - "Territory Checks" (history field - prepends with date)
- **Field 180** - "Current Territory Check" (current territory, no date)
- **Field 179** - "Company" (for consultant company)
- **Field 45** - "Person Type" (set to "Consultant")

**Find field IDs in ActiveCampaign:**
- Go to Lists → Manage Fields → Click on each field → Copy the Field ID from URL

**If your field IDs differ, update them in:**
- The n8n workflow nodes that reference these field IDs

#### b. List IDs

**Current implementation uses:**
- **List 39** - "Franchise Consultants"
- **List 40** - "Second list" (required for field 178 access)

**Important:** Field 178 is list-specific and only accessible when contact is on lists 39 & 40. The workflow adds new consultants to both lists before updating field 178.

#### c. API Credentials

**In n8n, configure:**
- ActiveCampaign credentials with your account URL and API key
- Add contacts endpoint: `https://YOUR_ACCOUNT.api-us1.com/api/3/contacts`
- Field values endpoint: `https://YOUR_ACCOUNT.api-us1.com/api/3/contactFieldValues`
- Notes endpoint: `https://YOUR_ACCOUNT.api-us1.com/api/3/notes`

---

### 4. Airtable Setup

**Status:** Currently optional. The workflow focuses on ActiveCampaign integration.

**Future Enhancement:** Territory lookup and inquiry logging via Airtable can be added to:
1. Check state territory availability
2. Log all territory check inquiries
3. Track response history

**If you want to add Airtable integration:**

#### a. Base and Table IDs

**Find these in Airtable:**
- Open your base → Help (?) → API documentation
- Base ID is shown at top (starts with `app`)
- Table IDs are shown for each table (starts with `tbl`)

**IDs you'll need:**
1. **Base ID** - Your Airtable base identifier
2. **Territories table ID** - For territory lookup
3. **Inquiries table ID** - For logging territory checks

#### b. Airtable Schema Requirements

**Territories Table:**
- `State_Abbrev` (text) - Two-letter state code
- `Available` (checkbox) - Territory availability
- `Notes` (long text) - Optional notes

**Inquiries Table:**
- `Date` (date) - Date of inquiry
- `Network` (text) - IFPG, FranServe, FBA, TYN, Direct
- `Consultant` (text) - Consultant name
- `Prospect` (text) - Prospect name
- `Territory` (text) - Territory requested
- `State` (text) - State abbreviation

---

### 5. Gmail Labels Setup

**Create labels in Gmail (optional):**
1. "Processed-Territory-Check" - Mark emails that were processed as territory checks
2. Or use Gmail's built-in read status marking

**Configuration:**
- The workflow can mark emails as read or apply custom labels
- Gmail API will auto-create labels if they don't exist
- Pre-creating labels in Gmail is recommended for consistency

**Node:** "Mark Email as Read" or label node (near end of workflow)

---

### 6. Error Handling & Validation

**Current behavior:**
- **Not a territory check**: Workflow stops (email is not processed)
- **Missing required fields** (prospect name, territory): Extraction returns validation errors in output
- **Consultant not found**: New consultant is created automatically
- **Field update fails**: Check ActiveCampaign field IDs and list membership

**Validation output from Extract Fields node:**
- `allFieldsValid` (boolean) - Whether all required fields were extracted
- `missingFields` (array) - List of fields that are null or too short
- `errorNotes` (string) - Human-readable error message
- `extraction_notes` (object) - Debug info about extraction process

**Monitoring:**
- Check n8n execution logs for failed runs
- Review Extract Fields output for validation errors
- Verify ActiveCampaign field mapping if updates aren't working

---

## Deployment Steps

### Step 1: Verify ActiveCampaign Configuration

1. Open ActiveCampaign and navigate to Lists → Manage Fields
2. Find your custom fields and note the IDs:
   - Field 178 - Territory Checks (history)
   - Field 180 - Current Territory Check
   - Field 179 - Company
   - Field 45 - Person Type
3. Verify lists exist:
   - List 39 - Franchise Consultants
   - List 40 - Second list

### Step 2: Configure Credentials in n8n

1. **Gmail OAuth2** - Connect your franchise email account
   - Allows workflow to read territory check emails
2. **ActiveCampaign API** - Add your account API credentials
   - URL: `https://YOUR_ACCOUNT.api-us1.com`
   - API Key: Your ActiveCampaign API token

### Step 3: Import/Review Workflow

1. Log into n8n at your instance
2. Import the workflow JSON: `Franchise Territory Checks - Working.json`
3. Review each node and verify:
   - Gmail trigger has correct email account
   - ActiveCampaign nodes reference correct field/list IDs
   - All credentials are assigned

### Step 4: Test with Sample Email

1. **Disable the workflow** (don't activate it yet)
2. Manually trigger with a sample territory check email
3. Click "Test" or "Execute Workflow" manually
4. Review output at each step:
   - **Extract Fields**: Verify all fields extracted correctly
   - **Is Territory Check**: Confirms it's a territory check email
   - **Find Consultant**: Shows if consultant exists
   - **Create Consultant** or skip: New vs existing consultant
   - **Update Territory Fields**: Verify field 178/180 updated in ActiveCampaign
5. Check ActiveCampaign contact to confirm:
   - Consultant created (if new)
   - Territory Checks field (178) shows date + territory
   - Current Territory Check field (180) shows territory

### Step 5: Activate Workflow

Once testing confirms extraction and ActiveCampaign updates work:
1. Click "Active" toggle in top right
2. Workflow will now process all new territory check emails
3. Monitor n8n execution log for the first few runs
4. Check ActiveCampaign for properly populated territory records

---

## Monitoring & Maintenance

### Check Executions Regularly

1. n8n Dashboard → Executions → View recent runs
2. Look for failed executions (red indicator)
3. Check the error message and execution details

### Common Issues & Solutions

1. **Extraction misses fields**
   - Check `/specs/RULES.md` for network-specific patterns
   - Verify email format matches documented patterns
   - Check `missingFields` output from Extract Fields node

2. **ActiveCampaign field not updating**
   - Verify field IDs are correct (178, 180, 179, 45)
   - Check that new consultants are on lists 39 & 40 before field 178 update
   - Verify ActiveCampaign credentials have API access

3. **Gmail trigger not firing**
   - Check Gmail label filters in trigger configuration
   - Verify OAuth2 credentials are still valid
   - Test trigger manually with "Fetch Test Event"

4. **Consultant not created**
   - Check ActiveCampaign API rate limits not exceeded
   - Verify email format is valid
   - Check n8n execution logs for error details

### Maintenance Tasks

- **Weekly**: Review execution logs for any failed runs
- **Monthly**: Test with sample emails from each network format
- **Quarterly**: Update extraction patterns if new email formats discovered
- **As needed**: Update field IDs if ActiveCampaign structure changes

### Future Enhancements

- [ ] Add territory availability lookup (Airtable integration)
- [ ] Send confirmation email to consultant
- [ ] Track response time metrics
- [ ] Add consultant follow-up automation
- [ ] Implement territory hold/reservation system
- [ ] Add error notification to admin

---

## Support

For issues with:
- **n8n workflow** → Check n8n community forums
- **AI extraction** → Review Information Extractor node docs
- **ActiveCampaign** → Check AC API documentation
- **Airtable** → Review Airtable API docs

---

## Workflow Architecture

```
Gmail Trigger (unread emails)
    ↓
Extract Fields (Code Node)
    ├─ Network Detection (IFPG, FranServe, FBA, TYN, Direct)
    ├─ Consultant extraction (name, email, phone, company)
    ├─ Prospect extraction (name, email, city, state, zip)
    ├─ Territory extraction (network-specific patterns)
    ├─ Date extraction (from forwarded messages)
    └─ Validation (returns allFieldsValid, missingFields)
    ↓
Is Territory Check? (If node - checks is_territory_check)
    ↓ (NO) → STOP
    ↓ (YES)
Find Consultant in ActiveCampaign (by email)
    ↓
Consultant Exists? (If node)
    ├─(NO - NEW)           ├─(YES - EXISTS)
    │   ↓                  │    ↓
    │   Create Contact     │    [Skip to update]
    │   ↓                  │
    │   Add to Lists       │
    │   (39 & 40)          │
    │   ↓                  │
    └────┬─────────────────┘
         ↓
    Update Territory Fields
    ├─ Field 178 (Territory Checks - history with date)
    ├─ Field 180 (Current Territory Check - territory only)
    └─ Create Note (same format as field 178)
    ↓
    Add Tags (optional)
    ↓
    Mark Email as Read (optional)
    ↓
    [Optional Future Steps]
    ├─ Territory lookup (Airtable)
    ├─ Send confirmation email
    └─ Log to Airtable
```

**Key Decision Points:**
- **Is Territory Check?**: Routes territory emails to processing, others stop
- **Consultant Exists?**: Branches to create new consultant or skip creation
- **Validation**: Extract Fields returns validation status for monitoring

---

## Key Documentation References

- **`/specs/QUICK-START.md`** - Quick resume guide for continuing work on the workflow
- **`/specs/RULES.md`** - Email parsing rules, patterns, and network-specific extraction logic
- **`/specs/ACTIVECAMPAIGN-FIELD-GUIDE.md`** - Complete guide for ActiveCampaign field access and updates
- **`/specs/LESSONS-LEARNED.md`** - All issues encountered, solutions, and important learnings
- **`/specs/MARK-EMAIL-READ-AND-ADD-TAG.md`** - Guide for marking emails and adding contact tags
- **`/docs/javascript-for-code-node.js`** - The complete extraction code used in the workflow
- **`/docs/Franchise Territory Checks - Working.json`** - The current workflow definition

---

**Version:** 2.0 (Updated for Code Node extraction)
**Last Updated:** 2025-11-13
**Status:** ✅ All known issues resolved, extraction fixed for ZIP codes and special characters