# Security Configuration

## Environment Variables

The following environment variables are required for secure operation:

### Backend (.env file in server/ directory)
```
PORT=5001
JWT_SECRET=your_secure_jwt_secret_here
NODE_ENV=production
```

### Frontend (.env.local file in root directory)
```
VITE_API_URL=http://localhost:5001
```

## JWT Secret Security

⚠️ **IMPORTANT**: The JWT_SECRET must be:
- At least 32 characters long
- Cryptographically secure random string
- Never committed to version control
- Different for each environment (dev/staging/production)

### Generating a Secure JWT Secret

```bash
# Generate a secure 64-character JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Production Deployment

For production (Dokploy), set these environment variables:

```
PORT=5001
JWT_SECRET=10WLkV5qHvXMgADdHm78e6DlBdH8SC4kmFUBSWaEDIQ
NODE_ENV=production
```

## Security Incident Response

If a JWT secret is accidentally committed:
1. Immediately rotate the secret in all environments
2. Force all users to re-authenticate
3. Review git history and consider repository cleanup if needed

## File Security

- `.env` files are ignored by git
- Never commit secrets to version control
- Use `.env.example` files for documentation