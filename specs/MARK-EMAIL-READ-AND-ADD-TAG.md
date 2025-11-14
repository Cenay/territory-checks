# Mark Email as Read and Add Tag to Contact

This guide covers the final two tasks for the territory checks workflow:
1. Mark processed emails as read in Gmail
2. Add tags to consultant contacts in ActiveCampaign

---

## Task 1: Mark Email as Read in Gmail

### Overview
After processing a territory check email, mark it as read so it won't be processed again when the Gmail trigger looks for unread messages.

### Node Configuration

**Node Type:** `n8n-nodes-base.gmail`  
**Resource:** `message`  
**Operation:** `update`  
**Node Name:** `Mark Email as Read`

### Configuration Steps

1. **Add Gmail Node** after your "Add Note to Contact" node (or at the end of both workflow paths)

2. **Set Parameters:**
   - **Resource:** `message`
   - **Operation:** `update`
   - **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
     - Or use `={{ $json.emailId }}` if your Extract Fields node provides `emailId`
   - **Update Fields:**
     - **Remove Label IDs:** Leave empty (or remove "UNREAD" label if needed)
     - **Add Label IDs:** Leave empty
     - **Mark as Read:** Check this option (if available)
     - **Mark as Unread:** Unchecked

### Alternative: Using modifyMessage Operation

If `update` doesn't have a "Mark as Read" option, use `modifyMessage`:

**Node Configuration:**
- **Resource:** `message`
- **Operation:** `modifyMessage`
- **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
- **Remove Label IDs:** `UNREAD` (if you know the UNREAD label ID)
- **Add Label IDs:** Leave empty

### Alternative: Using addLabels/removeLabels

If the above don't work, you can remove the "UNREAD" label:

**Node Configuration:**
- **Resource:** `message`
- **Operation:** `removeLabels`
- **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
- **Label IDs:** `UNREAD` (you may need to find the actual label ID)

**Note:** Gmail doesn't have a direct "UNREAD" label - unread status is the absence of the "READ" label. You may need to use `addLabels` with a custom label instead.

### Recommended: Add Custom Label

The most reliable approach is to add a custom label (e.g., "Processed") and filter it out:

1. **Create a Gmail label** called "Territory-Check-Processed" in your Gmail account

2. **Add Gmail Node:**
   - **Resource:** `message`
   - **Operation:** `addLabels`
   - **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
   - **Label IDs:** `Label_XXXXX` (replace with your label ID)

3. **Update Gmail Trigger Filter:**
   - Add filter to exclude emails with "Territory-Check-Processed" label
   - Or modify the trigger to check for unread AND not having the processed label

### Finding Label IDs

To find Gmail label IDs:
1. Use Gmail API: `GET https://www.googleapis.com/gmail/v1/users/me/labels`
2. Or use n8n Gmail node: Resource `label`, Operation `getAll`
3. Look for your label name and copy its `id`

### Placement in Workflow

Add this node at the end of both workflow paths:
- **After "Add Note to Contact"** (for new contacts)
- **After "Update a contact"** (for existing contacts)

Or use a Merge node to combine both paths, then add a single "Mark Email as Read" node.

---

## Task 2: Add Tag to Contact in ActiveCampaign

### Overview
Add a tag to the consultant contact record after creating or updating it. Tags help organize and filter contacts.

### Node Configuration

**Node Type:** `n8n-nodes-base.activeCampaign`  
**Resource:** `contactTag`  
**Operation:** `create`  
**Node Name:** `Add Territory Check Tag`

### Configuration Steps

1. **Add ActiveCampaign Node** after your contact creation/update nodes

2. **Set Parameters:**
   - **Resource:** `contactTag`
   - **Operation:** `create`
   - **Contact ID:** `={{ $json.id }}` (from previous node)
     - For new contacts: `={{ $('Create a contact').item.json.id }}`
     - For existing contacts: `={{ $json.id }}` (from "Update a contact")
   - **Tag:** Enter the tag name (e.g., "Territory Check Consultant")
     - Or use expression: `={{ 'Territory Check Consultant' }}`

### Alternative: Using HTTP Request Node

If the ActiveCampaign node doesn't have `contactTag` resource, use HTTP Request:

**Node Configuration:**
- **Node Type:** `n8n-nodes-base.httpRequest`
- **Method:** `POST`
- **URL:** `https://YOUR_ACCOUNT.api-us1.com/api/3/contactTags`
- **Authentication:** ActiveCampaign (API) credentials
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "contactTag": {
    "contact": "{{ String($json.id) }}",
    "tag": "Territory Check Consultant"
  }
}
```

**For new contacts:**
```json
{
  "contactTag": {
    "contact": "{{ String($('Create a contact').item.json.id) }}",
    "tag": "Territory Check Consultant"
  }
}
```

### Finding or Creating Tags

**Option 1: Use Existing Tag**
- If tag already exists, use its name exactly as it appears in ActiveCampaign

**Option 2: Create Tag First**
- Use ActiveCampaign node: Resource `tag`, Operation `create`
- Or create it manually in ActiveCampaign UI

**Option 3: Auto-Create Tag**
- ActiveCampaign API will create the tag if it doesn't exist when you add it to a contact

### Tag Name Suggestions

- `Territory Check Consultant`
- `Territory Check - Processed`
- `Consultant - Territory Check`
- `TC Consultant`

### Placement in Workflow

Add this node:
- **After "Add Note to Contact"** (for new contacts path)
- **After "Update a contact"** (for existing contacts path)

Or use a Merge node to combine paths, then add a single tag node.

---

## Complete Workflow Structure

### For New Contacts:
```
Create a contact
    ↓
Add to Consultant Lists (39 & 40)
    ↓
Update Custom Fields (Field 178)
    ↓
Add Note to Contact
    ↓
Add Tag to Contact          ← NEW
    ↓
Mark Email as Read          ← NEW
```

### For Existing Contacts:
```
Get Custom Fields
    ↓
Update a contact (Fields 178 & 180)
    ↓
Add Note to Contact
    ↓
Add Tag to Contact          ← NEW
    ↓
Mark Email as Read          ← NEW
```

### Using Merge Node (Recommended):

```
[New Contact Path] ──┐
                     ├──→ Merge ──→ Add Tag ──→ Mark Email as Read
[Existing Path] ────┘
```

---

## Troubleshooting

### Gmail Mark as Read Issues

**Problem:** Email still shows as unread
- **Solution:** Use custom label approach instead
- **Alternative:** Check if Gmail trigger filter needs updating

**Problem:** Can't find "Mark as Read" option
- **Solution:** Use `modifyMessage` or `addLabels` with custom label

### ActiveCampaign Tag Issues

**Problem:** Tag not appearing
- **Solution:** Verify tag name matches exactly (case-sensitive)
- **Check:** Ensure contact ID is correct and contact exists

**Problem:** "Tag not found" error
- **Solution:** Create tag manually first, or let API auto-create it
- **Verify:** Tag name doesn't contain special characters that need escaping

---

## Testing Checklist

- [ ] Email is marked as read (or has processed label)
- [ ] Email doesn't get reprocessed on next trigger run
- [ ] Tag appears on contact in ActiveCampaign
- [ ] Tag works for both new and existing contacts
- [ ] Workflow completes successfully end-to-end

---

**Last Updated:** After implementing mark as read and tag functionality

