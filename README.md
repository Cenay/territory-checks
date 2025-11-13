# Territory Checks Workflow

Automated email processing workflow for territory checks from networked consultants using n8n, ActiveCampaign, and Airtable.

## Overview

This project processes incoming territory check emails from various consultant networks (IFPG, TYN, FranServe, FBA, Direct), extracts prospect and territory information, updates ActiveCampaign contact records, checks territory availability in Airtable, and sends automated replies.

## Quick Start

**New to this project?** Start with [`docs/QUICK-START.md`](docs/QUICK-START.md)

## Documentation

- **[QUICK-START.md](docs/QUICK-START.md)** - Quick resume guide for continuing work
- **[LESSONS-LEARNED.md](docs/LESSONS-LEARNED.md)** - All issues encountered, solutions, and rabbit holes
- **[ACTIVECAMPAIGN-FIELD-GUIDE.md](docs/ACTIVECAMPAIGN-FIELD-GUIDE.md)** - Complete guide for ActiveCampaign field access
- **[RULES.md](docs/RULES.md)** - Technical rules and patterns for email parsing
- **[CONFIGURATION-GUIDE.md](CONFIGURATION-GUIDE.md)** - Workflow configuration instructions

## Key Files

- `docs/javascript-for-code-node.js` - Core email parsing logic
- `archive/territory-check-workflow-FINAL.json` - Complete workflow JSON (Please note, this failed despite multiple attempts to push the JSON to n8n)
- `docs/*-json-from-gmail.json` - Sample email data for testing

## Current Workflow

**n8n Workflow**: `https://n8n.trfaapi.com/workflow/gZHoQcN5bTwijo4a`

**Status**: ✅ All known issues resolved

**Latest Updates**:
- Date extraction from forwarded email headers
- List-specific field handling (add to lists before updating field 178)
- Note creation with same format as field 178

## Features

- Multi-network email parsing (IFPG, TYN, FranServe, FBA, Direct)
- Automatic prospect and territory extraction
- Date extraction from forwarded email headers for historical accuracy
- ActiveCampaign contact management with list-specific field handling
- Territory availability checking via Airtable
- Automated email replies
- Territory check history tracking (field 178)
- Current territory tracking (field 180)
- Note creation for audit trail

## Critical Gotchas

⚠️ **ActiveCampaign field IDs are strings** - Use `"178"` not `178`  
⚠️ **Field 178 is list-specific** - Contact must be on lists 39 & 40 before updating  
⚠️ **Workflow order matters** - Create → Add to Lists → Update Field 178 → Create Note  
⚠️ **Date extraction** - Uses `territory_check_date` from forwarded email, falls back to current date  
⚠️ **Forwarded emails** - Check body first, not headers  
⚠️ **Date format variations** - May be "Date:Mon" (no space) not "Date: Mon"  
⚠️ **Regex patterns** - Use non-greedy `+?` with explicit boundaries  
⚠️ **n8n expressions** - Use actual line breaks, not `\n`

See [`docs/LESSONS-LEARNED.md`](docs/LESSONS-LEARNED.md) for complete list.

## Project Structure

```
territory-checks/
├── docs/              # Documentation and parsing code
├── archive/           # Historical workflow versions and guides
├── specs/             # Specifications and samples
└── actions/           # GitHub Actions (if any)
```

## Contributing

Before making changes:
1. Review [`docs/LESSONS-LEARNED.md`](docs/LESSONS-LEARNED.md)
2. Check [`docs/RULES.md`](docs/RULES.md) for technical patterns
3. Test with sample emails from `docs/`

## License

[Add your license here]

