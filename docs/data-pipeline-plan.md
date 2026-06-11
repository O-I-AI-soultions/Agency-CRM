# Data Pipeline Building Plan

> Source: "Data Pipeline Building Plan.docx" (converted 2026-06-11)

Goal: an automated pipeline that finds local businesses with a phone number but **no website** — the agency's sales leads.

**Flow:** Apify (the Finder) → Make.com (the Bridge) → Airtable (the CRM)

## Step 1: Account Setup
- Open free accounts for Apify, Make, and Airtable.
- Set up the Airtable base and columns (e.g., Business Name, Phone Number, Rating, Status).

## Step 2: Apify (The Finder) Setup
- Configure a Google Maps scraper in Apify for a local niche.
- Set filters to isolate businesses that have a phone number but NO website.

## Step 3: Make (The Bridge) Setup
- Create a scenario in Make.com.
- Set the trigger to catch Apify's scraped data.
- Automatically route the filtered results to the database.

## Step 4: Airtable (The CRM) Integration
- Map the Make.com output modules to drop the clean data into the correct Airtable base columns.

## Step 5: Testing and Action
- Run a test scrape on Apify.
- Verify the data flows through Make and populates Airtable correctly.
- Manually review the Airtable list and start contacting leads.
