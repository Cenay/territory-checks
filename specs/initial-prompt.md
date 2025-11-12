# Initial Prompt  

I need help building an n8n workflow for [processing territory checks from networked consultants]
My setup: self-hosted on n8n.trfaapi.com, version 1.117.3
Available integrations: Gmail, ActiveCampaign, Airtable, and a few others. 

The Real Food Academy is franchising their business. They will be receiving "territory checks" from consultants in different networks. Each network has their own "format" for the request. We will be building a system that will review incoming emails to a specific email address, and IF it's a territory check, find or create a contact in ActiveCampaign for the consultant, then update the territory check fields:
  **Create**
 - Contact First Name
 - Contact Last Name
 - Contact Email
 - Contact Phone
 - Contact Network
 - Person Type: Consultant
 
 **Update**
  - Territory Checks (a text area. include the date, and the city/state they asked about)
  - Current Territory Check

If we have to create the consultant contact record, add them to the "Franchise consultant" list. Add tags "Consultant" and "Territory Check" 

The territory checks will be coming in from multiple sources. They share a common “theme” and language will be similar but not the same between the networks. 

IF the email being processed is not a territory check, do nothing.

Samples of the territory check emails are attached as "samples.md". Please note that the emails often contain images that have not been included in the sample text. 

Currently the request for a territory check is based on city/state, but some will also ask for a zip code, or county, or extra areas. (e.g. Boise, ID and surrounding areas)

We currently have an Airtable that lists the states and a checkbox for available or not.  Use that for a lookup to determine if the requested territory is available. 

Send a reply to the consultant with a YES or NO response. 
Update the Airtable LOG database with the response. 
Label the email as "Processed-Yes" or "Processed-No" or "Manual-Review". 

## Airtable Schema

**Territories table:**  

  ID  
  State_Name  
  State_Abbrev  
  Available  
  % Remaining  
  Notes  
  Related link to the Franchise_Inquiries table   

**Franchise_Inquiries table:**
  ID  
  Date  
  Network   
  Consultant    
  Prospect    
  City  
  State  
  Email_Subject  
  Email_Body  
  Reply_Status
  Territory (links to the Territories table)
  Available (from Territory) (links to the Territories table, available table) 


