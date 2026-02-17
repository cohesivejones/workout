# GitHub Actions Docker Setup

This document explains how to set up GitHub Actions to automatically build and push your Docker image to Docker Hub when you create a release.

## Prerequisites

- GitHub repository with admin access: `cohesivejones/workout`
- Docker Hub account: `drnatejones`

## Step 1: Create Docker Hub Access Token

1. Go to https://hub.docker.com/settings/security
2. Click **"New Access Token"**
3. **Token description:** `github-actions-workout`
4. **Access permissions:** **Read & Write**
5. Click **"Generate"**
6. **IMPORTANT:** Copy the token immediately (you won't see it again!)

## Step 2: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/cohesivejones/workout
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

### Add Secret 1: DOCKERHUB_USERNAME

- **Name:** `DOCKERHUB_USERNAME`
- **Value:** `drnatejones`
- Click **"Add secret"**

### Add Secret 2: DOCKERHUB_TOKEN

- **Name:** `DOCKERHUB_TOKEN`
- **Value:** Paste the Docker Hub access token from Step 1
- Click **"Add secret"**

## Step 3: How the Workflow Works

The GitHub Actions workflow (`.github/workflows/docker-build-release.yml`) automatically triggers when you:

1. **Create a GitHub release**, OR
2. **Push a git tag** matching `v*` pattern (e.g., `v1.0.0`)

### What it does:

1. ✅ Checks out your code
2. ✅ Sets up Docker Buildx (for multi-platform builds)
3. ✅ Logs into Docker Hub using your secrets
4. ✅ Builds the Docker image for **both amd64 and arm64** architectures
5. ✅ Pushes **three tags** to Docker Hub:
   - `drnatejones/natetastic-adventures:workout` (main/stable tag)
   - `drnatejones/natetastic-adventures:workout-v1.0.0` (version-specific tag)
   - `drnatejones/natetastic-adventures:workout-latest` (latest tag)

## Step 4: Create Your First Release

### Option A: Via GitHub UI (Recommended)

1. Go to https://github.com/cohesivejones/workout/releases
2. Click **"Draft a new release"**
3. Click **"Choose a tag"** → Type `v1.0.0` → Click **"Create new tag: v1.0.0 on publish"**
4. **Release title:** `v1.0.0 - Docker Production Release`
5. **Description:**

   ```markdown
   ## What's New

   - ✅ Single-container Docker setup with embedded PostgreSQL
   - ✅ Automatic database migrations on startup
   - ✅ Ready for NAS deployment
   - ✅ Multi-architecture support (amd64 + arm64)

   ## Docker Image

   Pull with:
   \`\`\`bash
   docker pull drnatejones/natetastic-adventures:workout-v1.0.0
   \`\`\`

   ## Test User Credentials

   - Email: `test@foo.com`
   - Password: `Secure123!`
   ```

6. Click **"Publish release"**

### Option B: Via Command Line

```bash
# Commit your Docker files
git add .
git commit -m "Add Docker support with embedded PostgreSQL"

# Create and push a tag
git tag -a v1.0.0 -m "Docker production release"
git push origin v1.0.0

# Then create the release on GitHub from the tag (or it will auto-build from the tag)
```

## Step 5: Monitor the Build

1. Go to the **Actions** tab in your GitHub repository
2. You'll see **"Build and Push Docker Image"** workflow running
3. Click on it to see the build progress
4. Build typically takes **5-10 minutes**
5. When complete (green checkmark ✅), your image is on Docker Hub!

## Step 6: Verify on Docker Hub

1. Go to https://hub.docker.com/r/drnatejones/natetastic-adventures/tags
2. You should see three new tags:
   - `workout`
   - `workout-v1.0.0`
   - `workout-latest`

## Using the Image

### On Your Local Machine

```bash
# Pull the latest image
docker pull drnatejones/natetastic-adventures:workout

# Pull a specific version
docker pull drnatejones/natetastic-adventures:workout-v1.0.0

# Run it
docker run -d \
  --name workout-app \
  -p 3000:3000 \
  -v workout-db:/var/lib/postgresql/data \
  -e PORT=3000 \
  -e PGUSER=postgres \
  -e PGDATABASE=workout_production \
  -e JWT_SECRET=your-secret-here \
  -e NODE_ENV=production \
  drnatejones/natetastic-adventures:workout
```

### On Your NAS

See `docs/NAS_DEPLOYMENT.md` for NAS-specific instructions.

## Troubleshooting

### Build fails with authentication error

- Verify that GitHub secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are set correctly
- Check that the Docker Hub token has Read & Write permissions
- Try regenerating the Docker Hub token if needed

### Build fails during image build

- Check the Actions logs for specific error messages
- Verify that your Dockerfile builds successfully locally
- Ensure all required files are committed to the repository

### Can't find the image on Docker Hub

- Verify the workflow completed successfully (green checkmark)
- Check you're looking at the correct repository: `drnatejones/natetastic-adventures`
- Look for tags starting with `workout`

### Multi-architecture build issues

- The workflow builds for both `linux/amd64` and `linux/arm64`
- If one architecture fails, the entire build fails
- Check the logs to see which architecture is problematic

## Next Steps

Once your image is on Docker Hub, you can:

1. ✅ Deploy to your Synology NAS (see `docs/NAS_DEPLOYMENT.md`)
2. ✅ Configure Docker to auto-restart on crashes
3. ✅ Set up automated backups of the database volume
4. ✅ Configure environment-specific variables

## Version Management

### Semantic Versioning

Use semantic versioning for your releases:

- `v1.0.0` - Major release
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)

### Creating Subsequent Releases

```bash
# For a new feature
git tag -a v1.1.0 -m "Add new feature"
git push origin v1.1.0

# For a bug fix
git tag -a v1.0.1 -m "Fix critical bug"
git push origin v1.0.1
```

Each new tag will trigger an automatic Docker build and push!
