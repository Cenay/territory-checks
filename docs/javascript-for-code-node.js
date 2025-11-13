// Enhanced Email Parser for Territory Check Workflow
// Handles 5 network formats: Direct Forms, IFPG, FranServe, FBA, TYN
// Version: 2.0 - Fixed prospect_email extraction issue

const emailBody = $input.item.json.text || $input.item.json.textPlain || $input.item.json.textHtml || '';
const emailSubject = $input.item.json.subject || '';
const emailHeaders = $input.item.json.headers || {};
const fullText = emailSubject + '\n' + emailBody;

// Get Reply-To for broker email (common in automated systems)
// For forwarded emails, extract from the forwarded message section in the body
let replyToEmail = null;

if (emailBody) {
  // First, try to extract from forwarded message headers in body (common in IFPG forwarded emails)
  // Pattern matches: "Reply-To: email@domain.com" or "Reply-To:\nemail@domain.com"
  // Use word boundary or whitespace/newline to stop at the end of the email
  const replyToBodyMatch = emailBody.match(/Reply-To[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s|$|\n|To:|From:)/i);
  if (replyToBodyMatch && replyToBodyMatch[1]) {
    replyToEmail = replyToBodyMatch[1].trim();
    // Exclude forwarding account emails
    if (replyToEmail.includes('franchise@therealfoodacademy.com') || 
        replyToEmail.includes('franchisetrfa@gmail.com')) {
      replyToEmail = null;
    }
  }
}

// Fallback to email headers if not found in body (for non-forwarded emails)
if (!replyToEmail) {
  let replyToHeader = emailHeaders['reply-to'] || emailHeaders['Reply-To'] || '';
  if (replyToHeader) {
    const replyToMatch = replyToHeader.match(/<([^>]+)>/);
    replyToEmail = replyToMatch ? replyToMatch[1] : replyToHeader.trim();
    // Exclude forwarding account emails
    if (replyToEmail && (replyToEmail.includes('franchise@therealfoodacademy.com') || 
        replyToEmail.includes('franchisetrfa@gmail.com'))) {
      replyToEmail = null;
    }
  }
}

// Helper function to extract field with multiple patterns
function extractField(text, patterns, options = {}) {
  const { returnNull = true, trim = true } = options;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = trim ? match[1].trim() : match[1];
      if (value.length > 0) {
        return value;
      }
    }
  }
  return returnNull ? null : '';
}

// Extract email addresses from body text (not headers)
function extractEmailFromBody(text, label) {
  // Only extract if explicitly labeled
  const patterns = [
    new RegExp(`${label}[:\\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})`, 'i'),
    new RegExp(`${label}[:\\s]+<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})>`, 'i')
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const email = match[1].trim();
      // Exclude forwarding account emails
      if (!email.includes('franchise@therealfoodacademy.com') &&
          !email.includes('franchisetrfa@gmail.com')) {
        return email;
      }
    }
  }
  return null;
}

// ============================================================================
// NETWORK IDENTIFICATION
// ============================================================================
let network = 'Unknown';

if (fullText.match(/fbamembers\.com|FBA Broker|Broker's Information:/i)) {
  network = 'FBA';
} else if (fullText.match(/ifpg\.org|IFPG Member|IFPG Inbox/i)) {
  network = 'IFPG';
} else if (fullText.match(/franserve|FranServe Consultant/i)) {
  network = 'FranServe';
} else if (fullText.match(/theyounetwork\.com|TYN/i)) {
  network = 'TYN';
} else if (fullText.match(/First Name\*:|Last Name\*:|forms? completed at/i)) {
  network = 'Direct';
}

// ============================================================================
// PROSPECT INFORMATION EXTRACTION
// ============================================================================

let prospectFirstName = null;
let prospectLastName = null;
let prospectName = null;
let prospectEmail = null;
let prospectCity = null;
let prospectState = null;
let prospectZip = null;

// Prospect Email - ONLY from explicit body labels
prospectEmail = extractEmailFromBody(emailBody, 'Prospect Email') ||
                extractEmailFromBody(emailBody, 'Email');

if (network === 'FBA') {
  // FBA Format: Client's Information section with First/Last Name
  prospectFirstName = extractField(fullText, [
    /First Name[:\s]+([A-Za-z]+)/i
  ]);
  prospectLastName = extractField(fullText, [
    /Last Name[:\s]+([A-Za-z]+)/i
  ]);
  if (prospectFirstName && prospectLastName) {
    prospectName = `${prospectFirstName} ${prospectLastName}`;
  }

  prospectCity = extractField(fullText, [
    /City[:\s]+([A-Za-z\s]+?)(?:\n|,|$)/i
  ]);
  prospectState = extractField(fullText, [
    /State[:\s]+([A-Z]{2})\b/i
  ]);
  prospectZip = extractField(fullText, [
    /Zip[:\s]+(\d{5})/i
  ]);

} else if (network === 'FranServe') {
  // FranServe Format: Prospect: Name followed by Prospect Email:
  prospectName = extractField(fullText, [
    /Prospect[:\s]+([A-Za-z\s&]+?)(?:\n|$)/i
  ]);

  // City/State from "Desired Territory" or address info
  const territory = extractField(fullText, [
    /Desired Territory[:\s]+([^\n]+)/i
  ]);
  if (territory) {
    const cityStateMatch = territory.match(/([A-Za-z\s]+),\s*([A-Z]{2})/);
    if (cityStateMatch) {
      prospectCity = cityStateMatch[1].trim();
      prospectState = cityStateMatch[2].trim();
    }
  }

} else if (network === 'IFPG') {
  // IFPG Format: Candidate: Name
  prospectName = extractField(fullText, [
    /Candidate[:\s]+([A-Za-z\s]+?)(?:\n|$)/i
  ]);

  // Extract city/state from "Interested in..." or territory description
  const territoryMatch = fullText.match(/Interested in ([^(]+?)(?:Area|area)?\s*\(Lives in zip code (\d{5})\)/i);
  if (territoryMatch) {
    prospectCity = territoryMatch[1].trim().replace(/,.*$/, '').trim();
    prospectZip = territoryMatch[2];
  } else {
    const cityStateMatch = fullText.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s+\d{5}/);
    if (cityStateMatch) {
      prospectCity = cityStateMatch[1].trim();
      prospectState = cityStateMatch[2].trim();
    }
  }

} else if (network === 'TYN') {
  // TYN Format: "client living in [City], [State]" or mentions names
  const clientMatch = fullText.match(/client living in ([^,]+),\s*([A-Z]{2})/i);
  if (clientMatch) {
    prospectCity = clientMatch[1].trim();
    prospectState = clientMatch[2].trim();
  }

  // Try to extract prospect name from "Please check your files/records for [Name]"
  // Pattern handles: "check your records for Brandt Schmidt and Meredith Watt and register"
  prospectName = extractField(fullText, [
    /check your (?:files|records) for ([A-Za-z\s&]+?)\s+and register/i,
    /check your (?:files|records) for ([A-Za-z\s&]+?)(?:\s+and|\s+register|$)/i,
    /client[:\s]+([A-Za-z\s&]+?)(?:\n|$)/i
  ]);

} else if (network === 'Direct') {
  // Direct Form: First Name*, Last Name*, Email:, City:, State:
  prospectFirstName = extractField(fullText, [
    /First Name\*?[:\s]+([A-Za-z]+)/i
  ]);
  prospectLastName = extractField(fullText, [
    /Last Name\*?[:\s]+([A-Za-z]+)/i
  ]);
  if (prospectFirstName && prospectLastName) {
    prospectName = `${prospectFirstName} ${prospectLastName}`;
  }

  prospectCity = extractField(fullText, [
    /City[:\s]+([A-Za-z\s]+?)(?:\n|$)/i
  ]);
  prospectState = extractField(fullText, [
    /State[:\s]+([A-Z]{2})/i
  ]);
}

// ============================================================================
// TERRITORY EXTRACTION
// ============================================================================

let territoryRequested = null;

// Network-specific territory extraction
if (network === 'FBA') {
  // FBA: Territory appears after "buttons below" and before "Territory Notes"
  const fbaMatch = fullText.match(/buttons below\.?\s*\n\s*([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/i);
  if (fbaMatch) {
    territoryRequested = fbaMatch[1].trim();
  } else {
    // Fallback: Look for City, ST ZIP pattern near Client's Information
    const fallbackMatch = emailBody.match(/([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})\s*(?:\n|$)/);
    if (fallbackMatch) {
      territoryRequested = fallbackMatch[1].trim();
    }
  }
} else if (network === 'FranServe') {
  // FranServe: "Desired Territory: ..."
  territoryRequested = extractField(fullText, [
    /Desired Territory[:\s]+([^\n]+)/i
  ]);
} else if (network === 'IFPG') {
  // IFPG: Multiple territory formats possible
  // Pattern 1: "Interested in ... Area" format
  const interestedMatch = fullText.match(/Interested in ([^(]+?)(?:Area|area)?\s*\(Lives in zip code \d{5}\)/i);
  if (interestedMatch) {
    territoryRequested = interestedMatch[1].trim();
  } else {
    // Pattern 2: "Prospect Name: [Name] -- Tcheck for: [Territory]"
    const tcheckMatch = fullText.match(/Tcheck for[:\s]+([^(\n]+?)(?:\s*\(zip|\s*-\s*if|\n|CLICK|$)/i);
    if (tcheckMatch) {
      territoryRequested = tcheckMatch[1].trim();
    } else {
      // Pattern 3: Territory on line after "Territory Check from [Name] for The Real Food Academy:"
      // This pattern handles the format: "Territory Check from [Name] for The Real Food Academy:\n\n[Territory]"
      // IMPORTANT: Must have at least one newline after the colon to avoid capturing header text
      const territoryLineMatch = fullText.match(/Territory Check from [^:]+:\s*\n+\s*([A-Za-z\s,]+?)(?:\n|CLICK|$)/i);
      if (territoryLineMatch) {
        const captured = territoryLineMatch[1].trim();
        // Make sure we didn't capture "for The Real Food Academy" or other unwanted text
        // Also exclude any text that contains "for The Real Food" or "IFPG Member" as these are header text
        if (captured && 
            !captured.match(/^(for The Real Food Academy|Prospect Name|CLICK|http|mailbox|IFPG Member|Territory Check)/i) &&
            !captured.includes('for The Real Food') &&
            captured.length > 2) {
          territoryRequested = captured;
        }
      }
      
      // Pattern 4: More specific pattern - only match if there's a clear territory pattern after the colon
      // This pattern requires the territory to look like a location (contains comma or state abbreviation)
      if (!territoryRequested) {
        const flexibleMatch = fullText.match(/Territory Check from [^:]+:\s*\n+\s*([A-Za-z\s,]+(?:,\s*[A-Z]{2})?[A-Za-z\s,]*?)(?:\n|CLICK|$)/i);
        if (flexibleMatch) {
          const captured = flexibleMatch[1].trim();
          // Strict validation: must not contain header keywords and must look like a location
          if (captured && 
              !captured.match(/^(for The Real Food Academy|Prospect Name|CLICK|http|mailbox|IFPG Member|Territory Check)/i) &&
              !captured.includes('for The Real Food') &&
              (captured.includes(',') || captured.match(/\b[A-Z]{2}\b/)) && // Must contain comma or state abbreviation
              captured.length > 2) {
            territoryRequested = captured;
          }
        }
      }
      
      // Pattern 5: Fallback - Look for territory pattern that appears after "for The Real Food Academy:" 
      // This is the most common IFPG format: "Territory Check from [Name] for The Real Food Academy:\n\n[Territory]"
      if (!territoryRequested) {
        const academyMatch = fullText.match(/for The Real Food Academy:\s*\n+\s*([A-Za-z\s,]+(?:,\s*[A-Z]{2})?[A-Za-z\s,]*?)(?:\n|CLICK|$)/i);
        if (academyMatch) {
          const captured = academyMatch[1].trim();
          // Must look like a location (contains comma or state abbreviation) and not be header text
          if (captured && 
              !captured.match(/^(Territory Check|IFPG Member|Prospect Name|CLICK|http|mailbox)/i) &&
              (captured.includes(',') || captured.match(/\b[A-Z]{2}\b/)) &&
              captured.length > 2) {
            territoryRequested = captured;
          }
        }
      }
    }
  }
} else if (network === 'TYN') {
  // TYN: Extract from subject line or market description
  const tynMatch = emailSubject.match(/Territory Check\s*[–-]\s*([^-]+?)\s*-\s*The Real Food Academy/i);
  if (tynMatch) {
    territoryRequested = tynMatch[1].trim();
  } else {
    // Fallback: look for market in body
    territoryRequested = extractField(fullText, [
      /in and around the ([^\n]+?) market/i,
      /living in ([^,]+,\s*[A-Z]{2})/i
    ]);
  }
} else if (network === 'Direct') {
  // Direct: Use City, State from form
  if (prospectCity && prospectState) {
    territoryRequested = `${prospectCity}, ${prospectState}`;
  }
} else {
  // Generic fallback patterns
  const territoryPatterns = [
    /Desired Territory[:\s]+([^\n]+)/i,
    /Interested in ([^\n]+?)(?:Area|area|market)/i,
    /([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/,  // City, ST 12345 format
    /([A-Za-z\s]+,\s*[A-Z]{2})(?:\s+area|\s+market)?/i
  ];
  territoryRequested = extractField(fullText, territoryPatterns);
}

// If we still don't have territory but have city/state, construct it
if (!territoryRequested && prospectCity && prospectState) {
  territoryRequested = prospectZip
    ? `${prospectCity}, ${prospectState} ${prospectZip}`
    : `${prospectCity}, ${prospectState}`;
}

// ============================================================================
// BROKER/CONSULTANT INFORMATION EXTRACTION
// ============================================================================

let brokerName = null;
let brokerEmail = null;
let brokerPhone = null;
let brokerCompany = null;

if (network === 'FBA') {
  brokerName = extractField(fullText, [
    /Broker's Name[:\s]+([A-Za-z\s]+?)(?:\n|$)/i
  ]);
  brokerEmail = extractEmailFromBody(emailBody, "Broker's Email");
  brokerPhone = extractField(fullText, [
    /Broker's Phone Number[:\s]+([\d\s()+-]+?)(?:\n|$)/i
  ]);
  brokerCompany = extractField(fullText, [
    /Broker's Company[:\s]+([^\n]+)/i
  ]);

} else if (network === 'FranServe') {
  brokerName = extractField(fullText, [
    /Referring Consultant[:\s]+([A-Za-z\s]+?)(?:\n|$)/i
  ]);
  brokerEmail = extractEmailFromBody(emailBody, 'Consultant Email');
  brokerPhone = extractField(fullText, [
    /Consultant Phone[:\s]+([\d\s()+-]+?)(?:\n|$)/i
  ]);
  brokerCompany = 'FranServe';

} else if (network === 'IFPG') {
  // Fix: Use non-greedy match and stop before "for" to avoid capturing "for Multiple Franchises"
  const memberMatch = fullText.match(/Territory Check from IFPG Member ([A-Za-z\s]+?)(?:\s+for|$)/i);
  if (memberMatch) {
    brokerName = memberMatch[1].trim();
  }

  // IFPG uses Reply-To for broker email
  if (replyToEmail && replyToEmail.includes('@')) {
    brokerEmail = replyToEmail;
  }

  brokerPhone = extractField(fullText, [
    /Phone[:\s]+([\d\s()+-]+?)(?:\n|$)/i
  ]);
  brokerCompany = 'IFPG';

} else if (network === 'TYN') {
  // TYN broker info from signature or "register to [Name] at TYN"
  const signatureMatch = fullText.match(/Thanks,\s+([A-Za-z\s]+)(?:\n|$)/i);
  if (signatureMatch) {
    brokerName = signatureMatch[1].trim();
  } else {
    // Fallback: extract from "register to [Name] at TYN"
    const registerMatch = fullText.match(/register to ([A-Za-z\s]+)\s+at TYN/i);
    if (registerMatch) {
      brokerName = registerMatch[1].trim();
    }
  }

  // TYN uses Reply-To or From email from forwarded message
  if (replyToEmail && replyToEmail.includes('@')) {
    brokerEmail = replyToEmail;
  } else {
    // Fallback: extract From email from forwarded message section
    const fromMatch = emailBody.match(/From[:\s]+[^<]*<([^>]+)>/i);
    if (fromMatch && fromMatch[1]) {
      const email = fromMatch[1].trim();
      if (!email.includes('franchise@therealfoodacademy.com') && 
          !email.includes('franchisetrfa@gmail.com')) {
        brokerEmail = email;
      }
    }
  }

  brokerCompany = 'The You Network';

} else if (network === 'Direct') {
  // No broker for direct inquiries
  brokerName = 'Direct Inquiry';
  brokerCompany = 'Website';
}

// ==================================================================
// VALIDATION AND OUTPUT
// ==================================================================

const requiredFields = {
  network,
  territoryRequested,
  prospectName
};

const missingFields = [];
for (const [field, value] of Object.entries(requiredFields)) {
  if (!value || value.length < 2) {
    missingFields.push(field);
  }
}

const allFieldsValid = missingFields.length === 0;

// Determine if this is a territory check
const isTerritoryCheck = fullText.match(/territory check/i) !== null;

// If prospect_name exists but first/last names don't, split the name
if (prospectName && !prospectFirstName && !prospectLastName) {
  const nameParts = prospectName.trim().split(/\s+/);
  if (nameParts.length > 0) {
    prospectFirstName = nameParts[0];
    if (nameParts.length > 1) {
      prospectLastName = nameParts.slice(1).join(' ');
    }
  }
}

return {
  json: {
    // Original email data
    emailId: $input.item.json.id,
    emailSubject: emailSubject,
    emailBody: emailBody.substring(0, 5000), // Truncate for storage
    emailFrom: $input.item.json.from,
    emailDate: $input.item.json.date,

    // Classification
    network: network,
    is_territory_check: isTerritoryCheck,

    // Prospect information
    prospect_first_name: prospectFirstName,
    prospect_last_name: prospectLastName,
    prospect_name: prospectName,
    prospect_email: prospectEmail, // Will be null if not explicitly in body
    prospect_city: prospectCity,
    prospect_state: prospectState,
    prospect_zip: prospectZip,

    // Territory
    territory_requested: territoryRequested,

    // Broker/Consultant information
    consultant_first_name: brokerName ? brokerName.split(' ')[0] : null,
    consultant_last_name: brokerName && brokerName.split(' ').length > 1
      ? brokerName.split(' ').slice(1).join(' ')
      : null,
    consultant_name: brokerName,
    consultant_email: brokerEmail,
    consultant_phone: brokerPhone,
    consultant_company: brokerCompany,

    // Validation status
    allFieldsValid: allFieldsValid,
    missingFields: missingFields,
    errorNotes: missingFields.length > 0
      ? `Missing or ambiguous fields: ${missingFields.join(', ')}`
      : null,

    // Debug info
    extraction_notes: {
      prospect_email_found: prospectEmail !== null,
      prospect_email_source: prospectEmail ? 'body_label' : 'not_found',
      network_identified: network,
      reply_to_available: replyToEmail !== ''
    }
  }
};
