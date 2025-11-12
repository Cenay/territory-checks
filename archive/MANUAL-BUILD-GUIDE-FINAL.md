# Territory Check Workflow - Manual Build Guide

Since API/JSON import has proven unreliable with n8n's UI, here's how to build it manually using the working "Franchise Territory Checks first draft - fail" as your starting point.

---

## Strategy

1. Open your existing "Franchise Territory Checks first draft - fail" workflow
2. Modify it node-by-node to match the new requirements
3. Add the ActiveCampaign nodes
4. This ensures the UI renders everything correctly

---

## Step 1: Modify Gmail Trigger

**Keep as-is** - The trigger is already configured correctly

---

## Step 2: Replace Code Node with AI Extractor

### Delete:
- "Parse Email - Extract Fields" (Code node)

### Add:
- **Information Extractor** node from LangChain category

### Configure Information Extractor:
- **Text:** `={{ $json.textPlain || $json.textHtml }}`
- **Schema Type:** From Attributes
- **Attributes:** (Add 13 attributes)

1. `is_territory_check` (boolean) - "Is this email a territory check request?"
2. `network` (string) - "Which network? IFPG/FranServe/FBA/Direct Form"
3. `consultant_first_name` (string) - "Consultant first name"
4. `consultant_last_name` (string) - "Consultant last name"
5. `consultant_email` (string) - "Consultant email"
6. `consultant_phone` (string) - "Consultant phone"
7. `prospect_first_name` (string) - "Prospect first name"
8. `prospect_last_name` (string) - "Prospect last name"
9. `prospect_email` (string) - "Prospect email"
10. `prospect_phone` (string) - "Prospect phone"
11. `territory_city` (string) - "City requested"
12. `territory_state` (string) - "State (2-letter code)"
13. `territory_county` (string) - "County if mentioned"

{cn} Ran into serious problems implementing this. Adjusted notes:
You have four different
networks with very different email formats:

1. Direct forms (therealfoodacademy.com/franchise) -
   Has prospect email
2. IFPG - Sometimes has prospect name, NO email,
   minimal structure
3. FranServe - Has both prospect name AND email
   explicitly listed
4. FBA - Has prospect details but NO email
5. TYN (The You Network) - Has NO prospect details at
   all, only broker info

Updated Information Extractor AI Prompt

Here's a comprehensive prompt that handles all these
formats:

Extract the following information from this territory
check or franchise inquiry email. Different networks
provide different levels of detail - extract what's
available and leave fields blank if not present.

FIELDS TO EXTRACT:

1. **prospect_name**:
    - Look for "First Name" + "Last Name" in Client's
      Information (FBA)
    - Look for "Candidate:" line (IFPG)
    - Look for "Prospect:" line (FranServe)
    - Look for names in "client living in" context (TYN)
    - Extract from form submissions (Direct)
    - Leave BLANK if not provided

2. **prospect_email**:
    - Look for "Prospect Email:" explicitly stated in
      body (FranServe)
    - Look for "Email:" in form submissions (Direct)
    - DO NOT extract from message headers (From, To,
      Reply-To, Delivered-To)
    - DO NOT guess or infer
    - Leave BLANK if not explicitly provided in body
      content

3. **prospect_city**: Extract from Client's Information
   or form data
4. **prospect_state**: Extract from Client's
   Information or form data
5. **prospect_zip**: Extract from Client's Information
   or form data

6. **territory_requested**:
    - Extract territory description (e.g., "Leander, TX
      78641", "Dallas/Ft Worth", "Greenville SC")
    - May appear as "Desired Territory:",
      city/state/zip, or descriptive area
    - Look in body content, not just structured fields

7. **broker_name**:
    - From "Broker's Information" (FBA)
    - From "Referring Consultant:" or sender name
      (FranServe)
    - From "Territory Check from IFPG Member [Name]"
      (IFPG)
    - From signature lines (TYN)

8. **broker_email**:
    - From "Broker's Email:" (FBA)
    - From "Consultant Email:" (FranServe)
    - From "Reply-To:" header if it's a
      broker/consultant email (IFPG, TYN)
    - NOT from the main From/To headers if they're
      system emails

9. **broker_phone**: From broker/consultant information
   sections

10. **broker_company**: From broker/consultant
    information sections

11. **source_network**: Identify the network based on
    email patterns:
    - "FBA" if from FBA Broker or fbamembers.com
    - "IFPG" if from IFPG Member or ifpg.org
    - "FranServe" if from FranServe Consultant or
      franservesupport.com
    - "TYN" if from theyounetwork.com
    - "Direct" if from website form submission
    - "Unknown" if unclear

CRITICAL RULES:
- Only extract email addresses that are EXPLICITLY
  labeled as prospect/client emails in the body
- Header emails (From, To, Reply-To, Delivered-To) are
  NOT prospect emails unless explicitly confirmed
- If information is not present, return BLANK/empty for
  that field
- Do not guess, infer, or make assumptions
- Some networks (IFPG, FBA, TYN) typically do NOT
  provide prospect emails

This prompt:
- Handles all 5 formats you've documented
- Never guesses prospect email
- Distinguishes between header emails and body emails
- Leaves fields blank when data isn't provided
- Identifies source network for potential
  routing/handling differences


### Connect:
Gmail Trigger → Information Extractor

---

## Step 3: Update First IF Node

### Modify "IF: All Required Fields Present?":
- Rename to: **"Is Territory Check?"**
- **Condition:** Boolean
  - Value 1: `={{ $json.is_territory_check }}`
  - Value 2: `true`

### Connect:
Information Extractor → Is Territory Check?

---

## Step 4: Add ActiveCampaign Nodes

After "Is Territory Check?" (TRUE branch), add these 6 nodes:

### 4.1 Find Consultant (ActiveCampaign)
- **Resource:** Contact
- **Operation:** Get All
- **Return All:** false
- **Limit:** 1
- **Email:** `={{ $json.consultant_email }}`
- **Continue on Fail:** true

**Connect:** Is Territory Check? [TRUE] → Find Consultant

---

### 4.2 Consultant Exists? (IF node)
- **Condition:** Number
  - Value 1: `={{ $json.length }}`
  - Operation: larger
  - Value 2: `0`

**Connect:** Find Consultant → Consultant Exists?

---

### 4.3 Create Consultant (ActiveCampaign)
- **Resource:** Contact
- **Operation:** Create
- **Email:** `={{ $json.consultant_email }}`
- **Update if Exists:** true
- **Additional Fields:**
  - First Name: `={{ $json.consultant_first_name }}`
  - Last Name: `={{ $json.consultant_last_name }}`
  - Phone: `={{ $json.consultant_phone }}`
  - **Field Values:**
    - Field: [YOUR_NETWORK_FIELD_ID]
    - Value: `={{ $json.network }}`
    - Field: [YOUR_PERSON_TYPE_FIELD_ID]
    - Value: `Consultant`

**Connect:** Consultant Exists? [FALSE branch] → Create Consultant

---

### 4.4 Add to Consultant List (ActiveCampaign)
- **Resource:** Contact List
- **Operation:** Add
- **List:** [YOUR_CONSULTANT_LIST_ID]
- **Contact:** `={{ $json.id }}`

**Connect TWO inputs:**
- Consultant Exists? [TRUE branch] → Add to Consultant List
- Create Consultant → Add to Consultant List

---

### 4.5 Tag: Consultant (ActiveCampaign)
- **Resource:** Contact Tag
- **Operation:** Add
- **Contact:** `={{ $json.id }}`
- **Tag:** [YOUR_CONSULTANT_TAG_ID]

**Connect:** Add to Consultant List → Tag: Consultant

---

### 4.6 Tag: Territory Check (ActiveCampaign)
- **Resource:** Contact Tag
- **Operation:** Add
- **Contact:** `={{ $json.id }}`
- **Tag:** [YOUR_TERRITORY_CHECK_TAG_ID]

**Connect:** Tag: Consultant → Tag: Territory Check

---

## Step 5: Replace Territory Lookup Code Node

### Delete:
- "Territory Lookup - Placeholder" (Code node)

### Add:
- **Airtable** node (Search operation)

### Configure Airtable Territory Lookup:
- **Operation:** Search Records
- **Base:** [YOUR_AIRTABLE_BASE_ID]
- **Table:** [YOUR_TERRITORIES_TABLE_ID]
- **Filter by Formula:** `AND({City} = '{{ $json.territory_city }}', {State} = '{{ $json.territory_state }}')`

**Connect:** Tag: Territory Check → Airtable: Territory Lookup

---

## Step 6: Keep Existing Territory Available IF Node

**Keep as-is** but update condition:
- **Condition:** Number
  - Value 1: `={{ $json.length }}`
  - Operation: equal
  - Value 2: `0`

(Length = 0 means NOT found in Airtable = AVAILABLE)

**Connect:** Airtable: Territory Lookup → Territory Available?

---

## Step 7: Update Email Reply Nodes

### YES Reply (Gmail node):
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

**Connect:** Territory Available? [TRUE] → Gmail: Reply YES

---

### NO Reply (Gmail node):
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

**Connect:** Territory Available? [FALSE] → Gmail: Reply NO

---

## Step 8: Update Airtable Logging

### Modify existing Airtable log node:
- **Operation:** Append
- **Base:** [YOUR_AIRTABLE_BASE_ID]
- **Table:** [YOUR_FRANCHISE_INQUIRIES_TABLE_ID]
- **Fields:**
  - Network: `={{ $('Extract Territory Check Data').item.json.network }}`
  - Consultant Name: `={{ $('Extract Territory Check Data').item.json.consultant_first_name + ' ' + $('Extract Territory Check Data').item.json.consultant_last_name }}`
  - Consultant Email: `={{ $('Extract Territory Check Data').item.json.consultant_email }}`
  - Prospect Name: `={{ $('Extract Territory Check Data').item.json.prospect_first_name + ' ' + $('Extract Territory Check Data').item.json.prospect_last_name }}`
  - City: `={{ $('Extract Territory Check Data').item.json.territory_city }}`
  - State: `={{ $('Extract Territory Check Data').item.json.territory_state }}`
  - Available: `={{ $('Territory Available?').item.json.territoryAvailable ? 'Yes' : 'No' }}`

**Connect TWO inputs:**
- Gmail: Reply YES → Airtable: Log Inquiry
- Gmail: Reply NO → Airtable: Log Inquiry

---

## Step 9: Add Gmail Labeling

### Add Gmail node:
- **Resource:** Message
- **Operation:** Add Labels
- **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
- **Label IDs:** [YOUR_TERRITORY_CHECK_LABEL_ID]

**Connect:** Airtable: Log Inquiry → Gmail: Add Label

---

## Final Workflow Structure

```
Gmail Trigger
  ↓
Extract Territory Check Data (AI)
  ↓
Is Territory Check? (IF)
  ↓ [TRUE]
Find Consultant (ActiveCampaign)
  ↓
Consultant Exists? (IF)
  ├─ [TRUE] → Add to Consultant List
  └─ [FALSE] → Create Consultant → Add to Consultant List
         ↓
    Tag: Consultant
         ↓
    Tag: Territory Check
         ↓
    Airtable: Territory Lookup
         ↓
    Territory Available? (IF)
      ├─ [TRUE] → Gmail: Reply YES ─┐
      └─ [FALSE] → Gmail: Reply NO ─┘
             ↓
    Airtable: Log Inquiry
             ↓
    Gmail: Add Label
```

---

## IDs You Need to Find

### ActiveCampaign:
1. Network custom field ID
2. Person Type custom field ID
3. "Franchise consultant" list ID
4. "Consultant" tag ID
5. "Territory Check" tag ID

### Airtable:
6. Base ID (from URL)
7. Territories table ID
8. Franchise_Inquiries table ID

### Gmail:
9. "Territory Check" label ID (or use label name directly)

---

## Testing Checklist

- [ ] Save workflow
- [ ] Configure all credentials (Gmail, ActiveCampaign, Airtable, OpenAI)
- [ ] Replace all placeholder IDs
- [ ] Execute workflow manually with test email
- [ ] Check each node output in execution log
- [ ] Verify ActiveCampaign contact created/updated
- [ ] Verify tags applied
- [ ] Verify Airtable record created
- [ ] Verify email reply sent
- [ ] Verify Gmail label applied
- [ ] Activate workflow

---

## Why Manual Build?

The n8n API creates the workflow correctly (confirmed by API queries), but the UI fails to render it - showing blank canvas and changing the name to "My workflow". This appears to be a browser cache or n8n UI sync bug that manual building avoids.

Manual building also gives you more control and understanding of each node's configuration.
