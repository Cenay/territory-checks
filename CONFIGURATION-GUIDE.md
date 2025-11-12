# Territory Check Workflow - Configuration Guide

## Overview

This n8n workflow automates the processing of territory check requests from franchise consultants across multiple networks (IFPG, FranServe, FBA, and direct forms).

## Workflow Flow

1. **Gmail Trigger** - Monitors inbox for new emails
2. **AI Extraction** - Uses Information Extractor to classify and parse email data (consultant info, prospect info, territory details)
3. **Classification Check** - Routes only territory check emails (stops processing if not a territory check)
4. **Find Consultant** - Searches ActiveCampaign for existing consultant by email
5. **Consultant Exists Check** - Branches based on whether consultant was found:
   - **If NEW consultant:**
     - Creates consultant contact in ActiveCampaign
     - Sets First Name, Last Name, Email, Phone
     - Sets Contact Network field (IFPG, FranServe, FBA, or Direct Form)
     - Sets Person Type field to "Consultant"
     - Adds to "Franchise consultant" list
     - Adds "Consultant" tag
     - Adds "Territory Check" tag
   - **If EXISTING consultant:**
     - Skips creation and list/tag additions
6. **Update Territory Fields** - Updates consultant record with:
   - Appends to "Territory Checks" field (date + city/state)
   - Updates "Current Territory Check" field
7. **Territory Lookup** - Checks Airtable Territories table for state availability
8. **Response Generation** - Creates personalized YES/NO reply message based on availability
9. **Email Reply** - Sends response to consultant
10. **Logging** - Records inquiry in Airtable Franchise_Inquiries table
11. **Email Labeling** - Applies Gmail label ("Processed-Yes" or "Processed-No")

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

### 2. Information Extractor (AI) Setup

**Node:** Extract Territory Check Info

**Requirements:**
- Configure OpenAI or compatible LLM credentials in n8n
- The node uses 13 extraction attributes defined in the workflow

**What it extracts:**
- `is_territory_check` (boolean) - Classification
- `network` (string) - IFPG, FranServe, FBA, Direct Form, or Unknown
- Consultant details: first_name, last_name, email, phone
- Prospect details: first_name, last_name, email
- Territory details: city, state, zip_code, territory_notes

**No configuration needed** - extraction schema is pre-built.

---

### 3. ActiveCampaign Setup

You need to configure the following ActiveCampaign IDs:

#### a. Custom Field IDs

**Find these in ActiveCampaign:**
- Go to Lists → Manage Fields → Click on each field → Copy the Field ID from URL

**Fields needed:**
1. **Contact Network** field → Replace `CONTACT_NETWORK_FIELD_ID`
2. **Person Type** field → Replace `PERSON_TYPE_FIELD_ID`
3. **Territory Checks** (text area) → Replace `TERRITORY_CHECKS_FIELD_ID`
4. **Current Territory Check** → Replace `CURRENT_TERRITORY_CHECK_FIELD_ID`

**Nodes to update:**
- `Create Consultant` (line 157, 161)
- `Update Territory Check Fields` (line 222, 226)

#### b. List ID

**Find in ActiveCampaign:**
- Go to Lists → Click "Franchise consultant" list → Copy ID from URL

**Replace:** `FRANCHISE_CONSULTANT_LIST_ID` in node `Add to Franchise Consultant List` (line 179)

#### c. Tag IDs

**Find in ActiveCampaign:**
- Go to Contacts → Tags → Click tag → Copy ID from URL

**Tags needed:**
1. "Consultant" tag → Replace `CONSULTANT_TAG_ID` (line 192)
2. "Territory Check" tag → Replace `TERRITORY_CHECK_TAG_ID` (line 205)

---

### 4. Airtable Setup

#### a. Base and Table IDs

**Find these in Airtable:**
- Open your base → Help (?) → API documentation
- Base ID is shown at top (starts with `app`)
- Table IDs are shown for each table (starts with `tbl`)

**IDs needed:**
1. **Base ID** → Replace `AIRTABLE_BASE_ID` (lines 246, 294)
2. **Territories table ID** → Replace `TERRITORIES_TABLE_ID` (line 250)
3. **Franchise_Inquiries table ID** → Replace `FRANCHISE_INQUIRIES_TABLE_ID` (line 298)

**Nodes to update:**
- `Lookup Territory in Airtable`
- `Log to Airtable`

#### b. Airtable Schema Requirements

**Territories Table must have:**
- `State_Abbrev` (text) - Two-letter state code
- `Available` (checkbox) - Territory availability
- `% Remaining` (number) - Optional
- `Notes` (long text) - Optional

**Franchise_Inquiries Table must have:**
- `Date` (date)
- `Network` (text or single select)
- `Consultant` (text)
- `Prospect` (text)
- `City` (text)
- `State` (text)
- `Email_Subject` (long text)
- `Email_Body` (long text)
- `Reply_Status` (text or single select: YES/NO)
- `Territory` (linked to Territories table)

---

### 5. Gmail Labels Setup

**Create these labels in Gmail:**
1. "Processed-Yes" - Applied when territory is available
2. "Processed-No" - Applied when territory is not available
3. "Manual-Review" - (For future use - edge cases)

**Node:** Label Email (line 323)

**Note:** The current workflow uses label names, not IDs. Gmail API will create labels if they don't exist, or you can pre-create them in Gmail.

---

### 6. Error Handling & Manual Review

**Current behavior:**
- If AI classifies email as NOT a territory check → workflow stops (no action)
- If consultant lookup fails → `continueOnFail: true` allows workflow to continue and create new consultant

**Future enhancement:** Add error output handling for edge cases that need manual review.

---

## Deployment Steps

### Step 1: Replace All Placeholder IDs

Use find/replace in the workflow JSON file:

```
CONTACT_NETWORK_FIELD_ID → [your actual field ID]
PERSON_TYPE_FIELD_ID → [your actual field ID]
TERRITORY_CHECKS_FIELD_ID → [your actual field ID]
CURRENT_TERRITORY_CHECK_FIELD_ID → [your actual field ID]
FRANCHISE_CONSULTANT_LIST_ID → [your actual list ID]
CONSULTANT_TAG_ID → [your actual tag ID]
TERRITORY_CHECK_TAG_ID → [your actual tag ID]
AIRTABLE_BASE_ID → [your actual base ID]
TERRITORIES_TABLE_ID → [your actual table ID]
FRANCHISE_INQUIRIES_TABLE_ID → [your actual table ID]
```

### Step 2: Configure Credentials in n8n

1. **Gmail OAuth2** - Connect your Gmail account
2. **ActiveCampaign API** - Add API URL and key
3. **Airtable Token** - Add personal access token
4. **OpenAI/LLM** - Add API key for Information Extractor

### Step 3: Import Workflow

1. Log into n8n at https://n8n.trfaapi.com
2. Click "+ Add workflow" → Import from File
3. Select `territory-check-workflow.json`
4. Review each node and confirm credentials are assigned

### Step 4: Test with Sample Email

1. **Disable the workflow** (don't activate yet)
2. Send a test email with one of the sample formats
3. Click "Execute Workflow" manually
4. Review each node's output
5. Verify:
   - AI extraction captured correct data
   - Consultant created/found in ActiveCampaign
   - Territory lookup worked
   - Reply email was generated correctly
   - Airtable log was created
   - Gmail label was applied

### Step 5: Activate Workflow

Once testing confirms everything works:
1. Click "Active" toggle in top right
2. Monitor for first few real territory checks
3. Review executions in n8n's execution log

---

## Monitoring & Maintenance

### Check Executions Regularly

- n8n → Executions → View recent runs
- Look for failed executions (red indicator)
- Review error messages and adjust workflow as needed

### Common Issues

1. **AI extraction misses data** → Adjust attribute descriptions in Information Extractor
2. **ActiveCampaign field not updating** → Verify field IDs are correct
3. **Airtable lookup fails** → Check state abbreviation format matches
4. **Gmail label not applied** → Verify labels exist in Gmail

### Future Enhancements

- [ ] Add "Manual-Review" path for ambiguous emails
- [ ] Add notification when territory check comes in
- [ ] Track response time metrics
- [ ] Add consultant follow-up automation
- [ ] Implement territory hold/reservation system

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
Gmail Trigger
    ↓
Extract Territory Check Info (AI)
    ↓
Is Territory Check? (If node)
    ↓ (TRUE)
Find Consultant in AC
    ↓
Consultant Exists? (If node)
    ↓                        ↓
(EXISTS)                (NEW)
    ↓                        ↓
    |                   Create Consultant
    |                        ↓
    |                   Add to Franchise Consultant List
    |                        ↓
    |                   Add Consultant Tag
    |                        ↓
    |                   Add Territory Check Tag
    |                        ↓
    └────────────────────────┘
                ↓
    Update Territory Check Fields
                ↓
    Lookup Territory in Airtable
                ↓
    Generate Response (Code)
                ↓
    Send Reply Email
                ↓
    Log to Airtable
                ↓
    Label Email (Processed-Yes/No)
```

---

**Version:** 1.0
**Created:** 2025-11-03
**n8n Version:** 1.117.3