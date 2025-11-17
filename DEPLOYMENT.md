# Deployment Guide

This guide walks you through deploying the Job Application Assistant to Netlify (frontend) and Heroku (backend), with MongoDB Atlas for database storage.

## Prerequisites

- Node.js (v18+) installed locally
- Git repository set up
- MongoDB Atlas account (free tier works)
- Netlify account (free tier works)
- Heroku account (free tier available, but consider paid tier for production)

## Part 1: MongoDB Atlas Setup

1. **Create a MongoDB Atlas Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up or log in
   - Create a new cluster (free tier M0 is sufficient)
   - Wait for the cluster to be created (2-3 minutes)

2. **Configure Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and strong password (save these!)
   - Set user privileges to "Atlas admin" or "Read and write to any database"
   - Click "Add User"

3. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For Heroku deployment, click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"
   - Note: For production, consider restricting to specific IPs

4. **Get Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `job-app-assistant` (or your preferred database name)
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/job-app-assistant?retryWrites=true&w=majority`
   - **Save this connection string** - you'll need it for Heroku

## Part 2: Heroku Backend Deployment

### Step 1: Install Heroku CLI

1. Download and install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Verify installation: `heroku --version`
3. Login: `heroku login`

### Step 2: Prepare the Backend

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Initialize Git repository (if not already done):**
   ```bash
   git init
   ```

3. **Ensure all dependencies are installed:**
   ```bash
   npm install
   ```

4. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

5. **Verify the build output exists:**
   - Check that `dist/index.js` exists

### Step 3: Create Heroku App

1. **Create a new Heroku app:**
   ```bash
   heroku create your-app-name
   ```
   Replace `your-app-name` with your desired app name (must be unique)

2. **Note your Heroku app URL:**
   - It will be something like: `https://your-app-name.herokuapp.com`
   - **Save this URL** - you'll need it for Netlify configuration

### Step 4: Configure Environment Variables

Set the required environment variables on Heroku:

```bash
# MongoDB Connection String (from Part 1)
heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/job-app-assistant?retryWrites=true&w=majority"

# JWT Secret (generate a strong random string)
# Generate one using: openssl rand -base64 32
heroku config:set JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Frontend URL (your Netlify URL - set this after deploying frontend)
# For now, you can set a placeholder and update it later
heroku config:set FRONTEND_URL="https://your-netlify-app.netlify.app"

# Node Environment
heroku config:set NODE_ENV="production"
```

**View all config vars:**
```bash
heroku config
```

### Step 5: Deploy to Heroku

1. **Ensure you're in the server directory:**
   ```bash
   cd server
   ```

2. **Add Heroku remote (if not already added):**
   ```bash
   heroku git:remote -a your-app-name
   ```

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Deploy backend to Heroku"
   git push heroku main
   ```
   Note: If your main branch is named `master`, use `git push heroku master`

4. **Monitor the deployment:**
   - Watch the build logs
   - Wait for "Build succeeded" message

5. **Verify deployment:**
   ```bash
   heroku open
   ```
   - You should see: "Job App Assistant Backend is Running!"

6. **Check logs:**
   ```bash
   heroku logs --tail
   ```
   - Look for "MongoDB Connected Successfully"
   - Look for server running message

### Step 6: Update Frontend URL (After Netlify Deployment)

Once you have your Netlify URL, update the Heroku config:

```bash
heroku config:set FRONTEND_URL="https://your-actual-netlify-url.netlify.app"
```

## Part 3: Netlify Frontend Deployment

### Step 1: Prepare the Frontend

1. **Navigate to the project root:**
   ```bash
   cd ..  # If you're in the server directory
   ```

2. **Verify netlify.toml exists:**
   - The file should be in the root directory
   - It should contain build configuration

3. **Test the build locally:**
   ```bash
   cd client
   npm install
   npm run build
   ```
   - Verify that `client/dist` directory is created
   - Check for any build errors

### Step 2: Deploy via Netlify Dashboard

1. **Go to [Netlify](https://app.netlify.com)**
   - Sign up or log in

2. **Add a new site:**
   - Click "Add new site" → "Import an existing project"
   - Connect to your Git provider (GitHub, GitLab, or Bitbucket)
   - Select your repository

3. **Configure build settings:**
   - **Base directory:** Leave empty (or set to root)
   - **Build command:** `cd client && npm install && npm run build`
   - **Publish directory:** `client/dist`
   - These should be auto-detected from `netlify.toml`

4. **Set environment variables:**
   - Go to Site settings → Environment variables
   - Add the following:
     - **Key:** `VITE_BACKEND_URL`
     - **Value:** `https://your-heroku-app-name.herokuapp.com/api`
     - Replace `your-heroku-app-name` with your actual Heroku app name

5. **Deploy:**
   - Click "Deploy site"
   - Wait for the build to complete
   - Your site will be live at: `https://random-name.netlify.app`

6. **Update site name (optional):**
   - Go to Site settings → General → Site details
   - Click "Change site name"
   - Choose a custom name: `your-app-name.netlify.app`

### Step 3: Update Heroku CORS Configuration

After you have your Netlify URL, update Heroku:

```bash
heroku config:set FRONTEND_URL="https://your-netlify-app.netlify.app"
```

This will allow your Netlify frontend to make API requests to your Heroku backend.

## Part 4: Verify Deployment

### Test Frontend

1. **Visit your Netlify URL:**
   - Open: `https://your-app.netlify.app`
   - The app should load

2. **Test registration:**
   - Try creating a new account
   - Check browser console for any errors

3. **Test API connection:**
   - After logging in, try accessing features
   - Check Network tab in browser DevTools
   - API calls should go to your Heroku backend

### Test Backend

1. **Check Heroku logs:**
   ```bash
   heroku logs --tail
   ```

2. **Test API endpoint:**
   - Visit: `https://your-heroku-app.herokuapp.com`
   - Should see: "Job App Assistant Backend is Running!"

3. **Test API route:**
   - Visit: `https://your-heroku-app.herokuapp.com/api/auth/register`
   - Should see an error (expected - needs POST request)
   - This confirms the route is accessible

## Part 5: Pushing Updates

Once your application is deployed, you'll need to push updates regularly. This section covers the quick and easy workflows for updating both the frontend and backend.

### Quick Update Workflow

**Best Practice:** Always test your changes locally before deploying to production.

1. **Test locally:**
   - Run the frontend: `cd client && npm run dev`
   - Run the backend: `cd server && npm run dev`
   - Verify all changes work as expected

2. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Description of your changes"
   git push origin main
   ```

### Backend Updates (Heroku)

Updating the backend is straightforward - just push to the Heroku remote.

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Ensure your changes are committed:**
   ```bash
   git status
   ```
   - If you have uncommitted changes, commit them first:
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

3. **Push to Heroku:**
   ```bash
   git push heroku main
   ```
   Note: If your main branch is named `master`, use `git push heroku master`

4. **Monitor the deployment:**
   - Watch the build logs in your terminal
   - Wait for "Build succeeded" message
   - The app will automatically restart after deployment

5. **Verify the update:**
   ```bash
   # Check logs for any errors
   heroku logs --tail
   
   # Test the API endpoint
   heroku open
   ```

**Quick Command:**
```bash
cd server && git push heroku main
```

### Frontend Updates (Netlify)

Netlify automatically deploys when you push to your connected Git repository. If you've connected your repository during initial setup, updates are automatic.

#### Automatic Deployment (Recommended)

1. **Commit and push to your Git repository:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Netlify will automatically:**
   - Detect the push to your repository
   - Start a new build
   - Deploy the updated site
   - You'll receive a notification when deployment completes

3. **Monitor the deployment:**
   - Go to your Netlify dashboard
   - Click on your site
   - View the "Deploys" tab to see build progress
   - Check build logs if there are any issues

#### Manual Deployment (If Needed)

If automatic deployment isn't working or you need to trigger manually:

1. **Go to Netlify Dashboard:**
   - Visit [Netlify](https://app.netlify.com)
   - Select your site

2. **Trigger deployment:**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"
   - Or use the Netlify CLI:
   ```bash
   cd client
   netlify deploy --prod
   ```

**Quick Command:**
```bash
git push origin main
```
(Netlify will automatically deploy)

### Updating Environment Variables

#### Backend (Heroku)

If you need to update environment variables:

```bash
# Update a single variable
heroku config:set KEY="new-value"

# Update multiple variables
heroku config:set KEY1="value1" KEY2="value2"

# View all variables
heroku config

# Remove a variable
heroku config:unset KEY
```

**Important:** After updating environment variables, restart the app:
```bash
heroku restart
```

#### Frontend (Netlify)

1. **Go to Netlify Dashboard:**
   - Site settings → Environment variables

2. **Update variables:**
   - Edit existing variables or add new ones
   - Click "Save"

3. **Redeploy:**
   - Changes require a new deployment
   - Go to "Deploys" → "Trigger deploy" → "Deploy site"
   - Or push a new commit to trigger automatic deployment

### Rollback Procedures

If something goes wrong, you can quickly rollback to a previous version.

#### Backend Rollback (Heroku)

1. **List recent releases:**
   ```bash
   heroku releases
   ```

2. **Rollback to a previous release:**
   ```bash
   heroku rollback v123
   ```
   Replace `v123` with the release number you want to rollback to

3. **Or rollback to the previous release:**
   ```bash
   heroku rollback
   ```

#### Frontend Rollback (Netlify)

1. **Go to Netlify Dashboard:**
   - Select your site
   - Go to "Deploys" tab

2. **Find the previous successful deploy:**
   - Browse through your deploy history

3. **Rollback:**
   - Click the three dots (⋯) next to the deploy you want
   - Select "Publish deploy"
   - Confirm the rollback

### Best Practices

1. **Test before deploying:**
   - Always test changes locally first
   - Run `npm run build` to catch build errors
   - Test API endpoints locally

2. **Use meaningful commit messages:**
   - Write clear, descriptive commit messages
   - Makes it easier to track changes and rollback if needed

3. **Deploy during low-traffic periods:**
   - Schedule major updates during off-peak hours
   - Reduces impact if issues occur

4. **Monitor after deployment:**
   - Check logs immediately after deployment
   - Monitor for errors or unusual behavior
   - Test critical features after deployment

5. **Keep dependencies updated:**
   - Regularly update npm packages
   - Test updates in a development environment first
   - Update one package at a time to identify issues

6. **Use feature branches:**
   - Create branches for new features
   - Test thoroughly before merging to main
   - Main branch should always be deployable

### Quick Reference Commands

**Backend (Heroku):**
```bash
# Deploy updates
cd server && git push heroku main

# View logs
heroku logs --tail

# Restart app
heroku restart

# Rollback
heroku rollback

# Check status
heroku ps
```

**Frontend (Netlify):**
```bash
# Deploy updates (automatic via Git push)
git push origin main

# Manual deploy (if using Netlify CLI)
cd client && netlify deploy --prod

# View build logs
# (Check Netlify dashboard)
```

## Troubleshooting

### Frontend Issues

**Build fails:**
- Check Netlify build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version (should be 18+)

**API calls fail:**
- Check `VITE_BACKEND_URL` environment variable in Netlify
- Verify CORS is configured correctly in Heroku
- Check browser console for CORS errors

**Routes not working:**
- Verify `netlify.toml` has redirect rules
- Check that SPA redirect is configured

### Backend Issues

**Build fails:**
- Check Heroku build logs: `heroku logs --tail`
- Ensure `Procfile` exists in `server/` directory
- Verify TypeScript compiles: `npm run build`

**MongoDB connection fails:**
- Verify `MONGODB_URI` is set correctly in Heroku
- Check MongoDB Atlas network access (should allow 0.0.0.0/0)
- Verify database user credentials

**CORS errors:**
- Check `FRONTEND_URL` is set in Heroku config
- Verify the URL matches your Netlify domain exactly
- Check server logs for CORS errors

**App crashes:**
- Check Heroku logs: `heroku logs --tail`
- Verify all environment variables are set
- Check for missing dependencies

### Common Commands

**Heroku:**
```bash
# View logs
heroku logs --tail

# View config vars
heroku config

# Set config var
heroku config:set KEY=value

# Restart app
heroku restart

# Open app
heroku open
```

**Netlify:**
- View build logs in Netlify dashboard
- Environment variables: Site settings → Environment variables
- Deploy logs: Deploys → Select deploy → View logs

## Next Steps

1. **Set up custom domain (optional):**
   - Netlify: Site settings → Domain management
   - Heroku: Settings → Domains

2. **Enable HTTPS:**
   - Both Netlify and Heroku provide HTTPS by default
   - No additional configuration needed

3. **Set up monitoring:**
   - Consider adding error tracking (Sentry, etc.)
   - Set up uptime monitoring

4. **Optimize performance:**
   - Enable Netlify CDN caching
   - Optimize images and assets
   - Consider Heroku add-ons for performance

## Environment Variables Summary

### Heroku (Backend)
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)
- `FRONTEND_URL` - Your Netlify app URL
- `NODE_ENV` - Set to "production"
- `PORT` - Automatically set by Heroku

### Netlify (Frontend)
- `VITE_BACKEND_URL` - Your Heroku backend URL + `/api`
  - Example: `https://your-app.herokuapp.com/api`

## Support

If you encounter issues:
1. Check the logs (Heroku and Netlify)
2. Verify all environment variables are set correctly
3. Ensure MongoDB Atlas is accessible
4. Check CORS configuration
5. Verify build processes complete successfully

