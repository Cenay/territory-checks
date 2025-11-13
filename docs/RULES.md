# Territory Check Email Parser - Rules and Findings

This document captures all rules, patterns, and edge cases discovered during development of the email parsing logic. **All future changes must review this document to ensure no rules are violated.**

---

## Table of Contents
1. [General Rules](#general-rules)
2. [Network-Specific Rules](#network-specific-rules)
3. [Email Format Rules](#email-format-rules)
4. [Extraction Patterns](#extraction-patterns)
5. [Common Pitfalls](#common-pitfalls)

---

## General Rules

### 1. Prospect Name Splitting
**Rule**: If `prospect_name` exists but `prospect_first_name` and `prospect_last_name` are both null, automatically split `prospect_name` on whitespace.
- First word becomes `prospect_first_name`
- Remaining words become `prospect_last_name`
- **Applies to ALL networks** - not just IFPG
- **Location**: This logic runs AFTER all network-specific extraction, just before the return statement

### 2. Prospect Email Extraction
**Rule**: Prospect emails should ONLY be extracted from explicit labels in the email body, NOT from headers.
- Look for patterns like "Prospect Email:" or "Email:" in body text
- **NEVER** extract from From, To, Reply-To, or other email headers
- Exclude forwarding account emails: `franchise@therealfoodacademy.com` and `franchisetrfa@gmail.com`

### 3. Forwarded Email Handling
**Rule**: For forwarded emails, extraction must prioritize the forwarded message section in the email body over the email headers object.
- Reply-To emails are found in the forwarded message headers section (e.g., "Reply-To: email@domain.com")
- Email headers object contains forwarding account information, not the original sender
- Always check email body first, then fall back to headers for non-forwarded emails

### 4. Email Address Extraction Boundaries
**Rule**: When extracting email addresses from forwarded message headers, use word boundaries to prevent capturing adjacent text.
- Pattern must stop at whitespace, newlines, or header markers like "To:" or "From:"
- Example: "Reply-To: email@domain.comTo:" should extract only "email@domain.com"
- Use pattern: `/Reply-To[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s|$|\n|To:|From:)/i`

---

## Network-Specific Rules

### IFPG Network

#### Consultant Name Extraction
**Rule**: Extract consultant name from "Territory Check from IFPG Member [Name] for..." pattern.
- **CRITICAL**: Use non-greedy match `+?` and stop before "for" to avoid capturing "for Multiple Franchises"
- Pattern: `/Territory Check from IFPG Member ([A-Za-z\s]+?)(?:\s+for|$)/i`
- **Example**: "Territory Check from IFPG Member Caleb Kenner for Multiple Franchises" → "Caleb Kenner" (NOT "Caleb Kenner for Multiple Franchises")

#### Consultant Email Extraction
**Rule**: Extract from Reply-To header in forwarded message section.
- Check email body first for "Reply-To: email@domain.com"
- Must stop at word boundaries to avoid capturing "To:" text
- Pattern includes boundary check: `(?:\s|$|\n|To:|From:)`

#### Territory Extraction
**Rule**: IFPG has multiple territory formats - check in this order:
1. **Pattern 1**: "Interested in [Territory] Area (Lives in zip code 12345)"
2. **Pattern 2**: "Prospect Name: [Name] -- Tcheck for: [Territory]"
   - Pattern: `/Tcheck for[:\s]+([^(\n]+?)(?:\s*\(zip|\s*-\s*if|\n|CLICK|$)/i`
   - Stops before "(zip", "- if", newline, or "CLICK"
3. **Pattern 3**: Territory on line after "Territory Check from [Name] for The Real Food Academy:"
   - **CRITICAL**: Must have at least one newline (`\n+`) after the colon to avoid capturing header text
   - Pattern: `/Territory Check from [^:]+:\s*\n+\s*([A-Za-z\s,]+?)(?:\n|CLICK|$)/i`
   - Must filter out: "for The Real Food Academy", "Prospect Name", "CLICK", "http", "mailbox", "IFPG Member", "Territory Check"
   - Also excludes any text containing "for The Real Food" anywhere in the captured string
4. **Pattern 4**: More specific fallback pattern requiring location-like format
   - **CRITICAL**: Requires at least one newline after colon (`\n+\s*`)
   - Pattern: `/Territory Check from [^:]+:\s*\n+\s*([A-Za-z\s,]+(?:,\s*[A-Z]{2})?[A-Za-z\s,]*?)(?:\n|CLICK|$)/i`
   - Must look like a location: contains comma OR state abbreviation (e.g., "NJ", "CA")
   - Must exclude header keywords: "for The Real Food Academy", "IFPG Member", "Territory Check", etc.
5. **Pattern 5**: Specific pattern for "for The Real Food Academy:" format
   - Pattern: `/for The Real Food Academy:\s*\n+\s*([A-Za-z\s,]+(?:,\s*[A-Z]{2})?[A-Za-z\s,]*?)(?:\n|CLICK|$)/i`
   - Must look like a location (contains comma or state abbreviation)
   - Must exclude header keywords

**Example**: "Prospect Name: Zeba Huque -- Tcheck for: Woodstock, Savannah, and Macon GA (zip 30188)" → "Woodstock, Savannah, and Macon GA"

**Example**: "Territory Check from Josh Sabo for The Real Food Academy:\n\nAtlantic County, NJ" → "Atlantic County, NJ" (NOT "Territory Check from IFPG Member Josh Sabo for The Real Food")

#### Prospect Name Extraction
**Rule**: Extract from "Candidate: [Name]" pattern.
- Pattern: `/Candidate[:\s]+([A-Za-z\s]+?)(?:\n|$)/i`

---

### TYN (The You Network)

#### Prospect Name Extraction
**Rule**: Extract from "Please check your files/records for [Name]" pattern.
- Must handle both "files" and "records" variations
- Pattern: `/check your (?:files|records) for ([A-Za-z\s&]+?)\s+and register/i`
- **Example**: "check your records for Brandt Schmidt and Meredith Watt and register" → "Brandt Schmidt and Meredith Watt"

#### Consultant Name Extraction
**Rule**: Extract from signature or "register to [Name] at TYN" pattern.
- Primary: "Thanks, [Name]" signature
- Fallback: "register to [Name] at TYN"

#### Consultant Email Extraction
**Rule**: Extract from Reply-To or From header in forwarded message section.
- Check Reply-To first
- Fallback to From header: `/From[:\s]+[^<]*<([^>]+)>/i`
- Exclude forwarding account emails

#### Territory Extraction
**Rule**: Extract from subject line or market description.
- Subject pattern: `/Territory Check\s*[–-]\s*([^-]+?)\s*-\s*The Real Food Academy/i`
- Fallback: "in and around the [Territory] market" or "living in [City], [State]"

---

### FranServe Network

#### Prospect Name Extraction
**Rule**: Extract from "Prospect: [Name]" pattern.

#### Territory Extraction
**Rule**: Extract from "Desired Territory: [Territory]" pattern.

#### Consultant Name Extraction
**Rule**: Extract from "Referring Consultant: [Name]" pattern.

---

### FBA Network

#### Prospect Information
**Rule**: Extract from structured "Client's Information" section.
- First Name, Last Name, City, State, Zip are separate fields
- Territory appears after "buttons below" and before "Territory Notes"

#### Consultant Information
**Rule**: Extract from "Broker's Information" section.
- Broker's Name, Broker's Email, Broker's Phone Number, Broker's Company

---

### Direct Network

#### Prospect Information
**Rule**: Extract from form fields with asterisks.
- "First Name*:", "Last Name*:", "Email:", "City:", "State:"

#### Territory Extraction
**Rule**: Construct from City and State if available.

---

## Email Format Rules

### Forwarded Email Structure
**Rule**: Forwarded emails contain a "-------- Forwarded Message --------" section with headers:
- Subject: [Original Subject]
- Date: [Original Date]
- From: [Original From]
- Reply-To: [Original Reply-To] ← **Extract consultant email from here**
- To: [Original To]

**CRITICAL**: Do NOT use email headers object for forwarded emails - use the forwarded message section in the body.

### Text Formatting
**Rule**: Email text may have inconsistent newlines and spacing.
- Patterns must handle multiple newlines (`\n+`)
- Patterns must handle whitespace variations (`\s+`, `\s*`)
- Some emails have headers on same line: "Reply-To: email@domain.comTo:" (no newline)

---

## Extraction Patterns

### Email Address Extraction
```javascript
// From forwarded message body (PRIORITY)
/Reply-To[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s|$|\n|To:|From:)/i

// From email headers (fallback)
/<([^>]+)>/  // Extract from <email@domain.com> format
```

### Name Extraction (Non-Greedy)
```javascript
// IFPG Consultant Name - MUST stop before "for"
/Territory Check from IFPG Member ([A-Za-z\s]+?)(?:\s+for|$)/i

// TYN Prospect Name - handles "files" and "records"
/check your (?:files|records) for ([A-Za-z\s&]+?)\s+and register/i
```

### Territory Extraction
```javascript
// IFPG "Tcheck for" format
/Tcheck for[:\s]+([^(\n]+?)(?:\s*\(zip|\s*-\s*if|\n|CLICK|$)/i

// IFPG line-after-colon format (Pattern 3)
// CRITICAL: Must have newlines after colon to avoid capturing header text
/Territory Check from [^:]+:\s*\n+\s*([A-Za-z\s,]+?)(?:\n|CLICK|$)/i
// Validation: Exclude "for The Real Food Academy", "IFPG Member", "Territory Check"

// IFPG flexible pattern with location validation (Pattern 4)
// CRITICAL: Requires newlines and location-like format (comma or state abbreviation)
/Territory Check from [^:]+:\s*\n+\s*([A-Za-z\s,]+(?:,\s*[A-Z]{2})?[A-Za-z\s,]*?)(?:\n|CLICK|$)/i
// Validation: Must contain comma OR state abbreviation, exclude header keywords

// IFPG "for The Real Food Academy:" pattern (Pattern 5)
/for The Real Food Academy:\s*\n+\s*([A-Za-z\s,]+(?:,\s*[A-Z]{2})?[A-Za-z\s,]*?)(?:\n|CLICK|$)/i
// Validation: Must look like location, exclude header keywords
```

---

## Common Pitfalls

### 1. Greedy Regex Matching
**Problem**: Patterns like `[A-Za-z\s]+` will match too much text.
**Solution**: Use non-greedy `+?` and explicit stop conditions.
**Example**: IFPG consultant name must stop before "for Multiple Franchises"

### 2. Email Boundary Issues
**Problem**: Email extraction captures adjacent text like "email@domain.comTo:"
**Solution**: Use boundary checks: `(?:\s|$|\n|To:|From:)`

### 3. Forwarded Email Headers
**Problem**: Using email headers object instead of forwarded message section.
**Solution**: Always check email body first for forwarded emails.

### 4. Territory Extraction Order
**Problem**: Wrong pattern matches first, capturing unwanted text.
**Solution**: Check patterns in order of specificity (most specific first).

### 5. Missing Name Splitting
**Problem**: `prospect_name` exists but first/last names are null.
**Solution**: Always split `prospect_name` if first/last are missing (applies to all networks).

### 6. Filtering Unwanted Text
**Problem**: Territory extraction captures "for The Real Food Academy" or other unwanted text like "Territory Check from IFPG Member Josh Sabo for The Real Food".
**Solution**: 
- Always filter out known unwanted patterns: "for The Real Food Academy", "Prospect Name", "CLICK", "http", "mailbox", "IFPG Member", "Territory Check"
- Require newlines (`\n+`) after colons in patterns to prevent same-line matches
- Validate that captured text looks like a location (contains comma or state abbreviation)
- Check for "for The Real Food" anywhere in captured string, not just at start

---

## Testing Checklist

When making changes, verify:
- [ ] IFPG consultant name stops before "for Multiple Franchises"
- [ ] IFPG territory extracts from "Tcheck for:" format
- [ ] IFPG territory extracts from line-after-colon format (Pattern 3)
- [ ] IFPG territory does NOT capture header text like "Territory Check from IFPG Member [Name] for The Real Food"
- [ ] IFPG territory validation excludes "for The Real Food", "IFPG Member", "Territory Check" keywords
- [ ] IFPG territory patterns require newlines after colons (not same-line matches)
- [ ] IFPG territory captured text looks like a location (contains comma or state abbreviation)
- [ ] Reply-To email doesn't include "To:" text
- [ ] Prospect name is split into first/last when only full name exists
- [ ] TYN prospect name handles both "files" and "records"
- [ ] Forwarded emails extract from body, not headers object
- [ ] All networks properly split prospect names

---

## Version History

- **v2.0**: Initial version with prospect_email extraction fix
- **v2.1**: Added IFPG consultant name fix (non-greedy match)
- **v2.2**: Added forwarded email Reply-To extraction from body
- **v2.3**: Added IFPG territory "Tcheck for:" pattern
- **v2.4**: Added prospect name splitting for all networks
- **v2.5**: Fixed Reply-To email boundary issues
- **v2.6**: Added TYN "records" pattern support
- **v2.7**: Fixed IFPG territory extraction to prevent capturing header text - added strict validation, location format requirements, and new Pattern 5

---

## Notes

- All regex patterns are case-insensitive (`/i` flag)
- Patterns use non-greedy matching (`+?`) when appropriate
- Always exclude forwarding account emails: `franchise@therealfoodacademy.com` and `franchisetrfa@gmail.com`
- Territory extraction should prioritize specific patterns over generic fallbacks
- When in doubt, test with actual email samples from each network

