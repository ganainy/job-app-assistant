# Portfolio Feature Testing Guide

## Prerequisites

1. ✅ API keys added to `server/.env`:
   - `GITHUB_TOKEN=ghp_your_token_here`
   - `APIFY_TOKEN=your_apify_token_here`
   - `MONGODB_URI=your_mongodb_connection`
   - `JWT_SECRET=your_jwt_secret`

2. ✅ Server and client are running:
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

## Testing Workflow

### Step 1: Create/Login to User Account

1. **Register a new user** (if you don't have one):
   - Go to: http://localhost:5173/register
   - Create account with email and password
   - Login at: http://localhost:5173/login

2. **Verify authentication works**:
   - You should be redirected to `/dashboard` after login
   - Check browser console for any errors

### Step 2: Setup Portfolio (Connect GitHub & LinkedIn)

1. **Navigate to Portfolio Setup**:
   - Go to: http://localhost:5173/portfolio-setup
   - Or add a link in your navigation menu

2. **Add GitHub URL**:
   - Enter your GitHub profile URL: `https://github.com/YOUR_USERNAME`
   - Click "Save URLs"
   - ✅ Should see success message

3. **Add LinkedIn URL** (optional):
   - Enter your LinkedIn profile URL: `https://linkedin.com/in/YOUR_USERNAME`
   - Click "Save URLs" again
   - ✅ Should see success message

4. **Sync LinkedIn Profile** (if you added LinkedIn URL):
   - Click "Sync LinkedIn Profile" button
   - ⏳ Wait for sync to complete (may take 10-30 seconds)
   - ✅ Should see success message with synced data

5. **Import GitHub Projects**:
   - Enter your GitHub username in the "GitHub Username" field
   - Click "Import Projects"
   - ⏳ Wait for import to complete
   - ✅ Should see success message with number of imported projects

### Step 3: Test Backend API Endpoints

#### Test GitHub Endpoints

**Test 1: Get GitHub Repositories**
```bash
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username
curl http://localhost:5001/api/github/repos/YOUR_GITHUB_USERNAME
```

**Expected Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 123456,
      "name": "repo-name",
      "description": "Repo description",
      "html_url": "https://github.com/username/repo-name",
      ...
    }
  ]
}
```

**Test 2: Get GitHub Skills**
```bash
curl http://localhost:5001/api/github/skills/YOUR_GITHUB_USERNAME
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "programmingLanguages": ["JavaScript", "TypeScript", "Python"],
    "otherSkills": ["React", "Node.js", "MongoDB"]
  }
}
```

#### Test Profile Endpoints

**Test 3: Get Current User Profile** (requires authentication)
```bash
# First, get your auth token from browser localStorage or login API
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/profile
```

**Test 4: Get Aggregated Profile** (public endpoint)
```bash
# Use your email as username (or username if you set one)
curl http://localhost:5001/api/profile/aggregated/YOUR_EMAIL
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "...",
    "name": "Your Name",
    "title": "Your Title",
    "bio": "Your bio",
    "skills": {
      "programmingLanguages": ["JavaScript", "TypeScript"],
      "otherSkills": ["React", "Node.js"]
    },
    "linkedinData": { ... },
    "profileImageUrl": "...",
    ...
  }
}
```

#### Test LinkedIn Endpoints

**Test 5: Sync LinkedIn** (requires authentication)
```bash
TOKEN="your_jwt_token_here"
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/linkedin/sync
```

**Test 6: Get LinkedIn Profile** (requires authentication)
```bash
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/linkedin/profile
```

#### Test Project Endpoints

**Test 7: Get Projects by Username** (public)
```bash
curl http://localhost:5001/api/projects/YOUR_EMAIL
```

**Test 8: Import GitHub Projects** (requires authentication)
```bash
TOKEN="your_jwt_token_here"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"githubUsername": "YOUR_GITHUB_USERNAME"}' \
  http://localhost:5001/api/projects/import-github
```

### Step 4: Test Frontend Portfolio Page

1. **View Your Portfolio**:
   - Go to: http://localhost:5173/portfolio/YOUR_EMAIL
   - Replace `YOUR_EMAIL` with your actual email address
   - ✅ Should see your portfolio page with:
     - Profile image (if uploaded)
     - Name and title
     - Bio
     - Programming languages from GitHub
     - Skills from GitHub
     - Projects (if imported)

2. **Test Portfolio Setup Page**:
   - Go to: http://localhost:5173/portfolio-setup
   - ✅ Should see form with GitHub and LinkedIn URL fields
   - ✅ Should be able to save URLs
   - ✅ Should be able to sync LinkedIn
   - ✅ Should be able to import GitHub projects
   - ✅ Should see preview link

### Step 5: Verify Data Flow

1. **Check Database**:
   - Verify Profile document was created in MongoDB
   - Check that `socialLinks.github` and `socialLinks.linkedin` are saved
   - Verify Projects were created after import

2. **Check Console Logs**:
   - Backend console should show:
     - GitHub API calls
     - LinkedIn sync progress
     - Project import status
   - Frontend console should show no errors

## Common Issues & Solutions

### Issue 1: "GitHub API token is required"

**Solution:**
- Check that `GITHUB_TOKEN` is set in `server/.env`
- Restart the server after adding the token
- Verify token format: should start with `ghp_`

### Issue 2: "Apify API token is missing or invalid"

**Solution:**
- Check that `APIFY_TOKEN` is set in `server/.env`
- Get token from: https://console.apify.com/account/integrations
- Restart the server after adding the token

### Issue 3: "User not found" when accessing portfolio

**Solution:**
- Make sure you're using the correct email/username
- Check that a Profile document exists for the user
- Try creating profile first via `/portfolio-setup` page

### Issue 4: GitHub repos not loading

**Solution:**
- Verify GitHub token has `public_repo` scope
- Check GitHub username is correct
- Test token directly: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`
- Check rate limits: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`

### Issue 5: LinkedIn sync fails

**Solution:**
- Verify LinkedIn URL format: `https://linkedin.com/in/username`
- Check Apify token is valid
- Check Apify account has credits
- Try with `?refresh=true` query parameter to force refresh

### Issue 6: Projects not showing

**Solution:**
- Make sure you imported projects via `/portfolio-setup`
- Check that projects have `isVisibleInPortfolio: true`
- Verify projects exist in database
- Check API endpoint: `GET /api/projects/YOUR_EMAIL`

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Can login/register user
- [ ] Can access `/portfolio-setup` page
- [ ] Can save GitHub URL
- [ ] Can save LinkedIn URL
- [ ] GitHub repos endpoint works: `/api/github/repos/USERNAME`
- [ ] GitHub skills endpoint works: `/api/github/skills/USERNAME`
- [ ] Can sync LinkedIn profile
- [ ] Can import GitHub projects
- [ ] Can view portfolio at `/portfolio/EMAIL`
- [ ] Portfolio shows profile data
- [ ] Portfolio shows skills from GitHub
- [ ] Portfolio shows projects
- [ ] No console errors in browser
- [ ] No errors in server logs

## Testing with Postman/Thunder Client

### Collection Setup

1. **Create Environment Variables:**
   - `baseUrl`: `http://localhost:5001/api`
   - `token`: (get from login response)

2. **Login First:**
   ```
   POST {{baseUrl}}/auth/login
   Body: {
     "email": "your@email.com",
     "password": "yourpassword"
   }
   ```
   - Copy the `token` from response
   - Set as environment variable

3. **Test Endpoints:**
   - All endpoints listed above
   - Use `Authorization: Bearer {{token}}` header for protected routes

## Expected Results

### Successful Portfolio Setup:
- ✅ Profile created/updated with GitHub and LinkedIn URLs
- ✅ LinkedIn profile synced (name, title, bio, location updated)
- ✅ GitHub projects imported (visible in database)
- ✅ Skills extracted from GitHub repos
- ✅ Portfolio page displays all data correctly

### Successful Portfolio View:
- ✅ Public URL works: `/portfolio/EMAIL`
- ✅ Shows profile information
- ✅ Shows programming languages from GitHub
- ✅ Shows other skills from GitHub
- ✅ Shows LinkedIn data (if synced)
- ✅ Shows imported projects
- ✅ No errors in console

## Next Steps After Testing

1. **Customize Portfolio**:
   - Add profile image
   - Edit bio and title
   - Reorder projects
   - Mark projects as featured

2. **Share Portfolio**:
   - Copy portfolio URL: `http://localhost:5173/portfolio/YOUR_EMAIL`
   - Share with others
   - Test on different devices/browsers

3. **Enhance Features** (Future):
   - Add CV upload
   - Add custom projects
   - Add contact form
   - Add analytics tracking

