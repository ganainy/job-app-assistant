# Quick Testing Guide - Portfolio Feature

## 🚀 Quick Start Testing

### 1. Start the Servers

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

### 2. Login to Your Account

1. Go to: http://localhost:5173/login
2. Login with your credentials
3. You should see the dashboard

### 3. Setup Your Portfolio

1. **Click "Portfolio" in the navigation menu** (or go to: http://localhost:5173/portfolio-setup)

2. **Add GitHub URL:**
   - Enter: `https://github.com/YOUR_GITHUB_USERNAME`
   - Click "Save URLs"
   - ✅ Should see "Profile updated successfully!"

3. **Add LinkedIn URL (optional):**
   - Enter: `https://linkedin.com/in/YOUR_LINKEDIN_USERNAME`
   - Click "Save URLs" again

4. **Sync LinkedIn (if added):**
   - Click "Sync LinkedIn Profile" button
   - ⏳ Wait 10-30 seconds
   - ✅ Should see "LinkedIn profile synced successfully!"

5. **Import GitHub Projects:**
   - Enter your GitHub username
   - Click "Import Projects"
   - ✅ Should see "Imported X projects from GitHub"

6. **Preview Your Portfolio:**
   - Click "Preview Portfolio" button
   - Copy the portfolio URL shown
   - Or use: `http://localhost:5173/portfolio/YOUR_EMAIL`

### 4. View Your Portfolio

1. **Open the portfolio URL** in a new tab (or incognito window):
   ```
   http://localhost:5173/portfolio/YOUR_EMAIL
   ```

2. **You should see:**
   - ✅ Your name and title (from LinkedIn or profile)
   - ✅ Your bio
   - ✅ Programming languages from GitHub repos
   - ✅ Skills from GitHub repos
   - ✅ Your imported projects

## 🧪 Test Backend Endpoints (Optional)

### Test GitHub Integration

```bash
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username
curl http://localhost:5001/api/github/repos/YOUR_GITHUB_USERNAME
curl http://localhost:5001/api/github/skills/YOUR_GITHUB_USERNAME
```

### Test Profile Endpoint

```bash
# Replace YOUR_EMAIL with your actual email
curl http://localhost:5001/api/profile/aggregated/YOUR_EMAIL
```

### Test Projects Endpoint

```bash
# Replace YOUR_EMAIL with your actual email
curl http://localhost:5001/api/projects/YOUR_EMAIL
```

## ✅ Success Indicators

### Backend Console Should Show:
- ✅ "MongoDB Connected Successfully"
- ✅ "Server is running at http://localhost:5001"
- ✅ No error messages when making API calls

### Frontend Should Show:
- ✅ Portfolio setup page loads without errors
- ✅ Success messages when saving/syncing
- ✅ Portfolio page displays your data
- ✅ No red errors in browser console

### Portfolio Page Should Display:
- ✅ Your name and title
- ✅ Bio text
- ✅ Programming languages (from GitHub)
- ✅ Skills (from GitHub)
- ✅ Projects grid (if imported)

## 🐛 Troubleshooting

### "GitHub API token is required"
- ✅ Check `GITHUB_TOKEN` is in `server/.env`
- ✅ Restart the server
- ✅ Token should start with `ghp_`

### "Apify API token is missing"
- ✅ Check `APIFY_TOKEN` is in `server/.env`
- ✅ Restart the server
- ✅ Get token from: https://console.apify.com/account/integrations

### Portfolio shows "User not found"
- ✅ Make sure you saved your GitHub/LinkedIn URLs first
- ✅ Use your email address in the URL: `/portfolio/YOUR_EMAIL`
- ✅ Check that Profile exists in database

### No projects showing
- ✅ Make sure you clicked "Import Projects" in setup page
- ✅ Check GitHub username is correct
- ✅ Verify projects exist: `GET /api/projects/YOUR_EMAIL`

### LinkedIn sync fails
- ✅ Check LinkedIn URL format: `https://linkedin.com/in/username`
- ✅ Verify Apify token is valid
- ✅ Check Apify account has credits

## 📝 Testing Checklist

- [ ] Server starts without errors
- [ ] Can login to account
- [ ] Can access `/portfolio-setup` page
- [ ] Can save GitHub URL
- [ ] Can save LinkedIn URL  
- [ ] Can sync LinkedIn profile
- [ ] Can import GitHub projects
- [ ] Can view portfolio at `/portfolio/EMAIL`
- [ ] Portfolio shows profile data
- [ ] Portfolio shows GitHub skills
- [ ] Portfolio shows imported projects
- [ ] No errors in browser console
- [ ] No errors in server logs

## 🎯 Next Steps

Once everything works:

1. **Share your portfolio**: Copy the URL and share with others
2. **Customize**: Add profile image, edit bio, reorder projects
3. **Test on different devices**: Check mobile responsiveness

For detailed testing instructions, see `PORTFOLIO_TESTING_GUIDE.md`

