# Database Migration Scripts

This directory contains database migration scripts for the application.

## Username Migration Script

### Purpose
Automatically generates usernames for all existing users who don't have one. This is a one-time migration to transition from email-based portfolio URLs to username-based URLs.

### File
`migrate-usernames.ts`

### How It Works

1. **Connects to MongoDB** using the connection string from `.env`
2. **Finds all users** without a username (where `username` is null, undefined, or empty)
3. **Generates usernames** from email addresses:
   - Takes the part before `@` in the email
   - Converts to lowercase
   - Replaces non-alphanumeric characters with hyphens
   - Ensures it's 3-30 characters long
   - Handles duplicates by adding a number suffix (e.g., `john-doe`, `john-doe1`, `john-doe2`)
4. **Updates each user** with their generated username
5. **Reports progress** showing each email → username mapping

### Usage

**Run the migration:**
```bash
cd server
npm run migrate:usernames
```

### Example Output

```
🔄 Starting username migration...

✅ Connected to MongoDB

📊 Found 4 users without usernames

✅ a@a.com → a00
✅ a2@a.com → a20
✅ a3@a.com → a30
✅ amrmohammedali11@gmail.com → amrmohammedali11

🎉 Successfully migrated 4 users!

✅ Disconnected from MongoDB

✅ Migration completed successfully!
```

### Safety Features

- **Idempotent**: Safe to run multiple times - only affects users without usernames
- **Unique usernames**: Automatically handles duplicates
- **Validation**: Ensures all usernames meet the 3-30 character requirement
- **Error handling**: Exits gracefully on errors

### When to Use

- **Initial migration**: After deploying the username feature for the first time
- **After data import**: If you've imported users from another system
- **Periodic cleanup**: If you notice users without usernames

### Important Notes

- ⚠️ **Run this BEFORE** deploying the backend changes that remove email-based portfolio lookup
- ⚠️ Users can change their generated username later via the Portfolio Setup page
- ⚠️ The script uses the production database if `MONGODB_URI` points to production

### Development vs Production

To run against a specific database, temporarily update your `.env` file:

```bash
# Development
MONGODB_URI=mongodb://localhost:27017/job-app-assistant

# Production
MONGODB_URI=mongodb+srv://...
```

Then run the migration and restore your `.env` afterward.

