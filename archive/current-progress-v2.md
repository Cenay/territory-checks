# Territory Check Workflow - Current Progress v2

**Date:** November 4, 2025
**Status:** Enhanced JavaScript parser complete, ready for workflow integration

---

## Problem Solved

The Information Extractor AI node was incorrectly extracting prospect emails from forwarding account headers instead of the email body. When emails were forwarded to franchisetrfa@gmail.com, the AI would use that forwarding address as the prospect email instead of finding the actual prospect email (or leaving it blank if not present).

### Example Issue:
- **Email forwarded by:** franchise@therealfoodacademy.com
- **Actual prospect:** Justin Dearing (no email provided in body)
- **What AI extracted:** franchise@therealfoodacademy.com ❌
- **What it should extract:** null/blank ✅

---

## Solution Implemented

Replaced the Information Extractor AI node with a **JavaScript Code node** that uses deterministic parsing logic.

### Key Files Created:

1. **parse-email-code-node.js** (v1) - Initial version
2. **parse-email-code-node_v2.js** (v2) - Fixed territory extraction for FBA network
3. **MANUAL-BUILD-GUIDE-v2.md** - Updated build guide with Code node instructions
4. **activecampaign-nodes-fragment.json** - 6 ActiveCampaign nodes for import

---

## Code Node Features

### Handles 5 Network Formats:

1. **Direct Forms** (therealfoodacademy.com/franchise)
   - Has prospect email in "Email:" field
   - Structured form data

2. **IFPG** (International Franchise Professionals Group)
   - Format: "Candidate: Name"
   - NO prospect email typically
   - Minimal structure

3. **FranServe**
   - Format: "Prospect: Name" followed by "Prospect Email: email@domain.com"
   - Both name AND email explicitly listed

4. **FBA** (Franchise Broker's Association)
   - Format: Client's Information section with First/Last Name
   - NO prospect email
   - Territory appears after "buttons below" and before "Territory Notes"

5. **TYN** (The You Network)
   - NO prospect details at all
   - Only broker info
   - Territory in subject line or body

### Prospect Email Extraction Rules:

- **ONLY** extracts from explicit body labels: "Prospect Email:", "Email:"
- **NEVER** uses header emails (From, To, Reply-To, Delivered-To)
- **EXCLUDES** forwarding accounts:
  - franchise@therealfoodacademy.com
  - franchisetrfa@gmail.com
- **Returns null** if not found (no guessing)

### Territory Extraction:

**Network-specific logic:**

- **FBA:** Looks for pattern after "buttons below" and before "Territory Notes"
  - Example: "Leander, TX 78641"

- **FranServe:** "Desired Territory: Austin, San Antonio or in between"

- **IFPG:** "Interested in Haslet, Texas Area"

- **TYN:** Extracts from subject line "Territory Check – Dallas/ Ft worth"

- **Direct:** Constructs from City + State form fields

### Broker Email Extraction:

- **FBA/FranServe:** Uses body labels ("Broker's Email:", "Consultant Email:")
- **IFPG/TYN:** Uses Reply-To header (broker/consultant email)
- **Never** uses main From/To headers if they're system emails

---

## Output Fields

The Code node returns:

```javascript
{
  // Original email data
  emailId: string,
  emailSubject: string,
  emailBody: string (truncated to 5000 chars),
  emailFrom: object,
  emailDate: string,

  // Classification
  network: string, // "FBA", "IFPG", "FranServe", "TYN", "Direct", "Unknown"
  is_territory_check: boolean,

  // Prospect information
  prospect_first_name: string | null,
  prospect_last_name: string | null,
  prospect_name: string | null,
  prospect_email: string | null, // null if not explicitly in body
  prospect_city: string | null,
  prospect_state: string | null,
  prospect_zip: string | null,

  // Territory
  territory_requested: string | null,

  // Broker/Consultant information
  consultant_first_name: string | null,
  consultant_last_name: string | null,
  consultant_name: string | null,
  consultant_email: string | null,
  consultant_phone: string | null,
  consultant_company: string | null,

  // Validation
  allFieldsValid: boolean,
  missingFields: array,
  errorNotes: string | null,

  // Debug
  extraction_notes: {
    prospect_email_found: boolean,
    prospect_email_source: string,
    network_identified: string,
    reply_to_available: boolean
  }
}
```

---

## Benefits Over AI Extractor

| Feature | AI Extractor (v1) | Code Node (v2) |
|---------|-------------------|----------------|
| **Consistency** | Unpredictable, same email → different results | Deterministic, same input → same output |
| **Cost** | API tokens per email | Zero API costs |
| **Speed** | AI inference (seconds) | Milliseconds |
| **Prospect Email** | Guesses from headers | Only explicit body labels |
| **Territory** | Generic patterns | Network-specific logic |
| **Debugging** | Black box | Full code visibility |
| **Modification** | Requires prompt tuning | Direct code changes |

---

## Workflow Structure

```
Gmail Trigger
  ↓
Parse Email - Extract Fields (Code/JavaScript) ← NEW
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

## Testing Samples

Sample emails for all 5 networks are documented in `/specs/samples.md`:

### FBA Sample (Richard Ashe - Justin Dearing):
- **Network:** FBA
- **Prospect Name:** Justin Dearing
- **Prospect Email:** None provided (should be null)
- **Territory:** Leander, TX 78641
- **Broker:** Richard Ashe (rich@veteranfranchiseadvisers.com)

### FranServe Sample (Jason Blough - John & Tina Crank):
- **Network:** FranServe
- **Prospect Name:** John & Tina Crank
- **Prospect Email:** johnpcrank@gmail.com
- **Territory:** Austin, San Antonio or in between
- **Consultant:** Jason Blough (jason@franchisesp.com)

### IFPG Sample (Keith Talty - Eva Slabosz-Stepniak):
- **Network:** IFPG
- **Candidate:** Eva Slabosz-Stepniak
- **Prospect Email:** None provided (should be null)
- **Territory:** Haslet, Texas Area (76052)
- **Broker:** Keith Talty (keith@franchiseexpert.com via Reply-To)

### TYN Sample (Monty Smith - Mike and Kelley Binnie):
- **Network:** TYN
- **Prospect:** Mike and Kelley Binnie
- **Prospect Email:** None provided (should be null)
- **Territory:** Dallas/Ft Worth (from subject)
- **Broker:** Monty Smith (monty@theyounetwork.com via Reply-To)

### Direct Form Sample:
- **Network:** Direct
- **Prospect:** Cenay Nailor
- **Prospect Email:** cenay@softwarethatrocks.com
- **Territory:** Morristown, AZ
- **Broker:** N/A (direct inquiry)

---

## Next Steps

### 1. Import ActiveCampaign Nodes
- Use `activecampaign-nodes-fragment.json`
- Replace placeholders:
  - `YOUR_ACTIVECAMPAIGN_CREDENTIAL_ID`
  - `YOUR_NETWORK_FIELD_ID`
  - `YOUR_PERSON_TYPE_FIELD_ID`
  - `YOUR_CONSULTANT_LIST_ID`
  - `YOUR_CONSULTANT_TAG_ID`
  - `YOUR_TERRITORY_CHECK_TAG_ID`

### 2. Add Code Node
- Create Code node named "Parse Email - Extract Fields"
- Copy contents from `parse-email-code-node_v2.js`
- Set mode to "Run Once for Each Item"
- Connect: Gmail Trigger → Parse Email - Extract Fields

### 3. Update Existing Nodes
- Update field references to use new Code node output
- Example: `{{ $json.territory_city }}` → `{{ $json.prospect_city }}`

### 4. Testing Checklist
- [ ] Test with FBA email (no prospect email expected)
- [ ] Test with FranServe email (has prospect email)
- [ ] Test with IFPG email (no prospect email expected)
- [ ] Test with TYN email (no prospect email expected)
- [ ] Test with Direct form (has prospect email)
- [ ] Verify territory extraction for each network
- [ ] Verify ActiveCampaign contact creation
- [ ] Verify Airtable logging
- [ ] Verify email replies sent

---

## Key Learnings

### 1. Forwarded Email Problem
When emails are forwarded, the Gmail API includes:
- `From:` header with the forwarder's email
- `To:` header with the receiving account
- Original email content in body

The AI was extracting emails from headers, not body content.

### 2. Network Format Variations
Each franchise broker network uses completely different email formats:
- Some provide prospect emails (FranServe, Direct)
- Some never provide emails (FBA, IFPG, TYN)
- Territory location varies (subject line, body sections, structured fields)

### 3. AI vs Deterministic Parsing
For structured email parsing with known formats:
- **AI:** Good for truly unstructured data, but unreliable and costly
- **Code:** Better for known formats, faster, free, debuggable

### 4. Territory Extraction Complexity
FBA's territory appears in a specific location (after "buttons below", before "Territory Notes"), requiring network-specific extraction logic rather than generic patterns.

---

## Architecture Decision

**Replaced AI-based extraction with rule-based parsing because:**

1. **Email formats are finite and known** (5 networks, documented patterns)
2. **Reliability > Flexibility** (same email must produce same result)
3. **Cost considerations** (thousands of emails × AI tokens adds up)
4. **Debugging needs** (easier to fix regex than retune prompts)
5. **Speed requirements** (JavaScript milliseconds vs AI seconds)

This is appropriate when:
- ✅ Input formats are well-defined
- ✅ Consistency is critical
- ✅ Volume is high
- ✅ Budget is limited

AI extraction remains valuable when:
- ❌ Formats are truly unpredictable
- ❌ New patterns emerge frequently
- ❌ Volume is low
- ❌ Flexibility > consistency

---

## Files Reference

### Code Files:
- `parse-email-code-node.js` - Initial parser (v1)
- `parse-email-code-node_v2.js` - Fixed territory extraction (v2) ⭐

### Documentation:
- `MANUAL-BUILD-GUIDE-FINAL.md` - Original guide (AI-based)
- `MANUAL-BUILD-GUIDE-v2.md` - Updated guide (Code-based) ⭐
- `current-progress-v2.md` - This file ⭐

### Configuration:
- `activecampaign-nodes-fragment.json` - 6 AC nodes for import ⭐
- `NODE-CONFIGURATIONS-REFERENCE.md` - Node config details
- `CORRECTED-GMAIL-TRIGGER.md` - Gmail trigger setup

### Samples:
- `specs/samples.md` - Email samples for all 5 networks ⭐

### Session Notes:
- `N8N-NIGHTMARE-SESSION-DISTILL.md` - Original session where we hit AI/API issues

⭐ = Critical files for current implementation

---

## Version History

### v1 (MANUAL-BUILD-GUIDE-FINAL.md)
- Used Information Extractor AI node
- Had prospect_email extraction issues
- Required OpenAI credentials
- Unpredictable results

### v2 (MANUAL-BUILD-GUIDE-v2.md) - Current
- Uses JavaScript Code node
- Fixed prospect_email extraction (never uses forwarding addresses)
- Fixed territory extraction (network-specific patterns)
- No AI/OpenAI required
- Deterministic, fast, free

---

## Contact & Questions

For issues with:
- **Prospect email extraction:** Check `extractEmailFromBody()` function
- **Territory extraction:** Check network-specific logic starting line 186
- **Broker email:** Check network detection and Reply-To header handling
- **Network detection:** Check patterns starting line 51

All code is heavily commented and includes the regex patterns used for each network format.
