# How to Get an Apify API Token for LinkedIn Integration

## Quick Steps

1. **Create Apify Account**
   - Go to: https://console.apify.com/
   - Sign up for a free account (or login if you have one)

2. **Get Your API Token**
   - After logging in, go to: https://console.apify.com/account/integrations
   - Or: Click your profile → Settings → Integrations
   - Find "Personal API tokens" section
   - Click "Create token" or copy existing token
   - Token will look like: `apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **Add to Your .env File**
   - Open: `server/.env`
   - Find or add: `APIFY_TOKEN=your_token_here`
   - Replace `your_token_here` with your actual token
   - Save the file

4. **Restart Your Server**
   - Stop the server (Ctrl+C)
   - Start it again: `npm run dev`
   - The server must be restarted for environment variable changes to take effect

## Verify Token is Loaded

After restarting, check the server console. You should NOT see:
- ❌ "Apify API token is missing or invalid"

If you still see the error:
1. Check that `APIFY_TOKEN` is in `server/.env` (not `client/.env`)
2. Check there are no spaces around the `=` sign
3. Check the token doesn't have quotes around it
4. Make sure you restarted the server

## Testing the Token

You can test if your token works by making a direct API call:

```bash
curl -X POST "https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "test-username", "includeEmail": true}'
```

If successful, you'll get a response. If invalid, you'll get an authentication error.

## Free Tier Limits

Apify free tier includes:
- Limited compute units per month
- Some actors may require paid credits
- Check your usage at: https://console.apify.com/account/usage

## Troubleshooting

### "Apify API token is missing or invalid"

**Possible causes:**
1. Token not in `.env` file
2. Token is still placeholder value: `your_apify_api_token_here`
3. Server not restarted after adding token
4. Token expired or revoked
5. Wrong token format

**Solutions:**
- ✅ Verify token in `server/.env` file
- ✅ Make sure token starts with `apify_api_`
- ✅ Restart the server completely
- ✅ Generate a new token if needed

### "Insufficient credits" Error

- Check your Apify account has available credits
- Some LinkedIn actors may require paid credits
- Visit: https://console.apify.com/account/usage

### Token Format

Your token should look like:
```
apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

NOT:
```
your_apify_api_token_here
apify_api_your_token_here
```

