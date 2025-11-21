# Deployment Guide - Pre-Production

This guide covers deploying the while:unemployed platform to pre-production using Vercel (frontend) and Koyeb (backend).

## Prerequisites

- Vercel account (free tier works)
- Koyeb account (free tier available)
- GitHub repository connected
- Environment variables ready:
  - `OPENAI_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Part 1: Deploy Backend to Koyeb

### Option A: Deploy via Koyeb Web UI (Recommended for first deployment)

1. **Login to Koyeb**
   - Go to [app.koyeb.com](https://app.koyeb.com)
   - Sign in or create account

2. **Create New Service**
   - Click "Create Service"
   - Select "Docker" as deployment method
   - Choose "GitHub" as source

3. **Configure Repository**
   - Connect your GitHub account
   - Select repository: `lukebrevoort/while_unemployed`
   - Branch: `main`
   - Dockerfile path: `backend/Dockerfile`

4. **Configure Service**
   - Service name: `while-unemployed-backend`
   - Instance type: `nano` (512MB RAM, 0.1 vCPU)
   - Region: Choose closest to your users (e.g., `fra` for Europe, `was` for US East)
   - Port: `8000`

5. **Set Environment Variables**
   Click "Add Environment Variable" for each:
   
   ```
   PORT=8000
   HOST=0.0.0.0
   ALLOWED_ORIGINS=http://localhost:3000
   OPENAI_API_KEY=<your-key>
   ```
   
   **Note**: Mark `OPENAI_API_KEY` as "Secret" for security

6. **Configure Health Check**
   - Path: `/health`
   - Port: `8000`
   - Interval: 30s
   - Timeout: 10s

7. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build and deployment
   - Copy the service URL (e.g., `https://while-unemployed-backend-xxx.koyeb.app`)

### Option B: Deploy via Koyeb CLI

```bash
# Install Koyeb CLI
curl -fsSL https://cli.koyeb.com/install.sh | sh

# Login
koyeb login

# Deploy from backend directory
cd backend
koyeb service create while-unemployed-backend \
  --docker dockerfile=Dockerfile \
  --instance-type nano \
  --port 8000:http \
  --env PORT=8000 \
  --env HOST=0.0.0.0 \
  --env ALLOWED_ORIGINS=http://localhost:3000 \
  --secret OPENAI_API_KEY=<your-secret-name> \
  --health-check http:8000:/health \
  --region fra
```

### Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-backend-url.koyeb.app/health

# Expected response:
# {"status":"healthy","sessions":0}
```

---

## Part 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Web UI (Recommended)

1. **Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select `lukebrevoort/while_unemployed` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: `Next.js` (auto-detected)
   - Root Directory: `frontend/tech-interview-prep`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Set Environment Variables**
   Add these in the "Environment Variables" section:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.koyeb.app
   OPENAI_API_KEY=<your-openai-key>
   ```
   
   **Important**: Set these for all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Copy the deployment URL (e.g., `https://while-unemployed.vercel.app`)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from project root
cd /workspaces/while_unemployed
vercel --prod

# Follow prompts:
# - Link to existing project or create new
# - Set root directory: frontend/tech-interview-prep
# - Override settings: No (use vercel.json)
```

### Verify Frontend Deployment

1. Visit your Vercel URL
2. Check that the app loads
3. Try to login/signup (should work with Supabase)

---

## Part 3: Connect Frontend and Backend

### Update CORS Configuration

1. **Update Backend ALLOWED_ORIGINS**
   - Go to Koyeb dashboard
   - Select your service
   - Go to "Settings" → "Environment Variables"
   - Update `ALLOWED_ORIGINS`:
     ```
     ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app-*.vercel.app
     ```
   - Redeploy the service

2. **Verify WebSocket Connection**
   - Open your Vercel app
   - Open browser DevTools → Console
   - Start an interview
   - Look for: `WebSocket connected`

---

## Part 4: Testing the Deployment

### Test Checklist

- [ ] Frontend loads without errors
- [ ] Can sign up / log in
- [ ] Can view problems list
- [ ] Can start an interview
- [ ] WebSocket connects successfully
- [ ] Can record audio and get transcriptions
- [ ] AI responds with text
- [ ] TTS audio plays
- [ ] Code editor works
- [ ] Code is sent to backend when stopping listening
- [ ] Can end interview and see feedback

### Common Issues

**Issue**: WebSocket connection fails
- **Solution**: Check CORS configuration in backend
- **Solution**: Verify `NEXT_PUBLIC_BACKEND_URL` is correct

**Issue**: "Missing credentials" error
- **Solution**: Verify all environment variables are set in Vercel

**Issue**: Build fails on Vercel
- **Solution**: Check build logs for missing dependencies
- **Solution**: Ensure `@headlessui/react` is in package.json

**Issue**: Backend health check fails
- **Solution**: Check Koyeb logs for startup errors
- **Solution**: Verify `OPENAI_API_KEY` is set correctly

---

## Monitoring and Logs

### Koyeb Logs
```bash
# View real-time logs
koyeb service logs while-unemployed-backend --follow

# Or via web UI:
# Dashboard → Service → Logs tab
```

### Vercel Logs
```bash
# View deployment logs
vercel logs

# Or via web UI:
# Dashboard → Project → Deployments → Click deployment → Logs
```

---

## Scaling Considerations

### Current Setup (MVP)
- **Backend**: Single instance (no Redis)
- **Frontend**: Serverless (auto-scales)
- **Limitations**: 
  - WebSocket connections limited to one backend instance
  - No session persistence across backend restarts

### Future Scaling (Production)
When you need to scale beyond MVP:

1. **Add Redis for Socket.IO**
   ```bash
   # Add to backend requirements.txt
   redis==5.0.0
   
   # Update main.py to use Redis adapter
   # See: https://socket.io/docs/v4/redis-adapter/
   ```

2. **Enable Multi-Instance Scaling**
   - Update `koyeb.yaml`: `max: 3` (or more)
   - Configure Redis connection in environment variables

3. **Add Database for Session Storage**
   - Consider PostgreSQL for interview sessions
   - Store transcriptions and feedback

---

## Cost Estimates (Pre-Production)

### Koyeb (Backend)
- **Nano instance**: ~$5-10/month
- **Bandwidth**: Included (100GB)
- **Free tier**: Available for testing

### Vercel (Frontend)
- **Hobby plan**: Free
- **Bandwidth**: 100GB included
- **Serverless functions**: 100GB-hours included

### OpenAI API
- **Whisper**: ~$0.006 per minute of audio
- **GPT-4**: ~$0.03 per 1K tokens
- **TTS**: ~$0.015 per 1K characters
- **Estimated**: $20-50/month for moderate usage

**Total Estimated Cost**: $25-70/month for pre-production

---

## Security Checklist

- [ ] All API keys stored as secrets (not plain text)
- [ ] CORS properly configured (not allowing all origins)
- [ ] Supabase RLS policies enabled
- [ ] HTTPS enforced on all endpoints
- [ ] Environment variables not committed to git
- [ ] `.env` files in `.gitignore`

---

## Rollback Procedure

### Rollback Backend (Koyeb)
```bash
# Via CLI
koyeb service redeploy while-unemployed-backend --deployment-id <previous-deployment-id>

# Via Web UI
# Dashboard → Service → Deployments → Click previous deployment → Redeploy
```

### Rollback Frontend (Vercel)
```bash
# Via CLI
vercel rollback <deployment-url>

# Via Web UI
# Dashboard → Project → Deployments → Click previous deployment → Promote to Production
```

---

## Next Steps

After successful deployment:

1. **Set up monitoring**
   - Configure Koyeb alerts for downtime
   - Set up Vercel analytics

2. **Test thoroughly**
   - Run through all user flows
   - Test with real interview scenarios
   - Check performance and latency

3. **Document issues**
   - Keep track of bugs found in production
   - Note performance bottlenecks

4. **Plan for production**
   - Consider Redis for scaling
   - Plan database strategy
   - Set up proper logging and monitoring

---

## Support

- **Koyeb Docs**: https://www.koyeb.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Issues**: Create GitHub issue in repository
