# How to Get a GitHub Personal Access Token

## Quick Steps

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Your Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**
   - Click **"Generate new token"** → **"Generate new token (classic)"**

3. **Configure Token**
   - **Note**: Give it a descriptive name (e.g., "Job App Assistant Portfolio")
   - **Expiration**: Choose your preferred duration (or "No expiration" for development)
   - **Select Scopes** (permissions):
     - ✅ `public_repo` - Access public repositories
     - ✅ `read:user` - Read user profile data
     - (Optional) `repo` - Full control of private repositories (if you want to include private repos)

4. **Generate and Copy**
   - Click **"Generate token"**
   - **IMPORTANT**: Copy the token immediately - you won't be able to see it again!
   - It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Where to Add the Token

### Option 1: Global Fallback (Recommended for Development)

Add to your `server/.env` file:

```env
GITHUB_TOKEN=ghp_your_token_here
```

This token will be used as a fallback when users haven't provided their own token.

### Option 2: User-Specific Token (Recommended for Production)

Users can add their own GitHub token in their profile settings:

1. Go to `/portfolio-setup` page (after logging in)
2. Add your GitHub URL: `https://github.com/yourusername`
3. The system will use the global token, but users can add their own token in profile integrations for:
   - Higher rate limits (5,000 vs 60 requests/hour)
   - Access to private repositories
   - Better security (each user controls their own token)

## Token Permissions Explained

- **`public_repo`**: Allows reading public repository data (code, commits, issues, etc.)
- **`read:user`**: Allows reading user profile information
- **`repo`** (optional): Full access to all repositories, including private ones

## Security Best Practices

1. **Never commit tokens to Git** - Always use `.env` files (which should be in `.gitignore`)
2. **Use different tokens for development and production**
3. **Set expiration dates** for production tokens
4. **Rotate tokens regularly** (every 90 days recommended)
5. **Revoke tokens** if they're compromised or no longer needed

## Testing Your Token

You can test if your token works by making a request:

```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

If successful, you'll get your GitHub user information.

## Troubleshooting

### "GitHub API token is required" Error

- Make sure `GITHUB_TOKEN` is set in your `server/.env` file
- Restart your server after adding the token
- Check that the token hasn't expired

### "Rate limit exceeded" Error

- GitHub has rate limits: 60 requests/hour without token, 5,000/hour with token
- If you hit the limit, wait an hour or use a personal access token
- Consider implementing caching (future enhancement)

### "Not Found" Error

- Check that the GitHub username is correct
- Verify the token has `public_repo` scope
- Make sure the repository is public (or token has `repo` scope for private repos)

