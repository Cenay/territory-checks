# Territory Check Workflow - Manual Build Guide v2

Since API/JSON import has proven unreliable with n8n's UI, here's how to build it manually using the working "Franchise Territory Checks first draft - fail" as your starting point.

**Version 2 Changes:**
- Replaced Information Extractor (AI) with JavaScript Code node for better reliability
- Fixed prospect_email extraction to never use forwarding account emails
- Improved territory extraction for all 5 network formats
- Network-specific parsing logic for deterministic results

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

## Step 2: Replace Code Node with Enhanced Parser

### Delete:
- "Parse Email - Extract Fields" (Code node) - if it exists

### Add:
- **Code** node (JavaScript)

### Configure Code Node:

**Node Name:** `Parse Email - Extract Fields`

**Mode:** Run Once for Each Item

**JavaScript Code:** Copy the contents of `parse-email-code-node_v2.js` from the project root.

#### What This Code Does:

This enhanced parser handles **5 different email formats**:

1. **Direct forms** (therealfoodacademy.com/franchise) - Has prospect email
2. **IFPG** - Sometimes has prospect name, NO email, minimal structure
3. **FranServe** - Has both prospect name AND email explicitly listed
4. **FBA** - Has prospect details but NO email
5. **TYN (The You Network)** - Has NO prospect details, only broker info

#### Key Features:

- **Network-specific parsing logic** for accurate extraction
- **Prospect email safety**: Only extracts when explicitly labeled in body (e.g., "Prospect Email:")
- **Excludes forwarding accounts**: Never uses franchise@therealfoodacademy.com or franchisetrfa@gmail.com
- **Broker email handling**: Uses Reply-To headers for IFPG/TYN, body labels for FBA/FranServe
- **Territory extraction**: Network-specific patterns (e.g., FBA looks after "buttons below")
- **Returns null for missing data**: Never guesses or infers

#### Output Fields:

The Code node returns a JSON object with:

- `emailId`, `emailSubject`, `emailBody`, `emailFrom`, `emailDate`
- `network` - Network identifier (FBA, IFPG, FranServe, TYN, Direct, Unknown)
- `is_territory_check` - Boolean flag
- `prospect_first_name`, `prospect_last_name`, `prospect_name`
- `prospect_email` - **null if not explicitly in body**
- `prospect_city`, `prospect_state`, `prospect_zip`
- `territory_requested` - Full territory description
- `consultant_first_name`, `consultant_last_name`, `consultant_name`
- `consultant_email`, `consultant_phone`, `consultant_company`
- `allFieldsValid` - Boolean (true if all required fields present)
- `missingFields` - Array of missing field names
- `errorNotes` - Description of validation issues
- `extraction_notes` - Debug info about the extraction process

### Connect:
Gmail Trigger → Parse Email - Extract Fields

---

## Step 3: Update First IF Node

### Modify "IF: All Required Fields Present?":
- Rename to: **"Is Territory Check?"**
- **Condition:** Boolean
  - Value 1: `={{ $json.is_territory_check }}`
  - Value 2: `true`

### Connect:
Parse Email - Extract Fields → Is Territory Check?

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
Yes, {{ $('Parse Email - Extract Fields').item.json.prospect_city }}, {{ $('Parse Email - Extract Fields').item.json.prospect_state }} is available.

Best regards,
The Real Food Academy
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
No, {{ $('Parse Email - Extract Fields').item.json.prospect_city }}, {{ $('Parse Email - Extract Fields').item.json.prospect_state }} is not available at this time.

Best regards,
The Real Food Academy
```

**Connect:** Territory Available? [FALSE] → Gmail: Reply NO

---

## Step 8: Update Airtable Logging

### Modify existing Airtable log node:
- **Operation:** Append
- **Base:** [YOUR_AIRTABLE_BASE_ID]
- **Table:** [YOUR_FRANCHISE_INQUIRIES_TABLE_ID]
- **Fields:**
  - Network: `={{ $('Parse Email - Extract Fields').item.json.network }}`
  - Consultant Name: `={{ $('Parse Email - Extract Fields').item.json.consultant_name }}`
  - Consultant Email: `={{ $('Parse Email - Extract Fields').item.json.consultant_email }}`
  - Prospect Name: `={{ $('Parse Email - Extract Fields').item.json.prospect_name }}`
  - Prospect Email: `={{ $('Parse Email - Extract Fields').item.json.prospect_email }}`
  - City: `={{ $('Parse Email - Extract Fields').item.json.prospect_city }}`
  - State: `={{ $('Parse Email - Extract Fields').item.json.prospect_state }}`
  - Territory Requested: `={{ $('Parse Email - Extract Fields').item.json.territory_requested }}`
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
Parse Email - Extract Fields (Code/JavaScript)
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
- [ ] Configure all credentials (Gmail, ActiveCampaign, Airtable)
- [ ] Copy JavaScript code from `parse-email-code-node_v2.js` into Code node
- [ ] Replace all placeholder IDs
- [ ] Execute workflow manually with test email (use samples from /specs/samples.md)
- [ ] Check Code node output - verify network detection
- [ ] Check prospect_email field - should be null for FBA/IFPG/TYN samples
- [ ] Verify territory_requested extraction for each network format
- [ ] Verify ActiveCampaign contact created/updated
- [ ] Verify tags applied
- [ ] Verify Airtable record created
- [ ] Verify email reply sent
- [ ] Verify Gmail label applied
- [ ] Activate workflow

---

## Why Code Node Instead of AI Extractor?

**Version 1** used the Information Extractor (AI) node, which had several issues:

1. **Inconsistent extraction** - AI would guess at prospect emails using forwarding addresses
2. **Token costs** - Every email processed costs API tokens
3. **Slower processing** - AI inference takes longer than JavaScript
4. **Unpredictable** - Same email could produce different results

**Version 2** uses a JavaScript Code node which provides:

1. **Deterministic results** - Same input always produces same output
2. **Zero API costs** - No external calls required
3. **Faster** - Executes in milliseconds
4. **Network-specific logic** - Tailored patterns for each email format
5. **Complete control** - Easy to debug and modify extraction rules

---

## Why Manual Build?

The n8n API creates the workflow correctly (confirmed by API queries), but the UI fails to render it - showing blank canvas and changing the name to "My workflow". This appears to be a browser cache or n8n UI sync bug that manual building avoids.

Manual building also gives you more control and understanding of each node's configuration.
