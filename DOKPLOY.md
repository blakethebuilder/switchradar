# Deploying SwitchRadar to Dokploy

This guide outlines how to deploy SwitchRadar to your Dokploy VPS.

## 🛠 Prerequisites
1. A Dokploy instance running on your VPS.
2. The SwitchRadar repository pushed to GitHub.

## 🚀 Deployment Steps

### 1. Create a New Application
1. Log in to your Dokploy dashboard.
2. Create a new **Project** (e.g., "LeadMap") or select an existing one.
3. Click **"Deploy Application"**.

### 2. Configure Source
1. Select **"GitHub"** as the source.
2. Connect your GitHub account if you haven't already.
3. Select the repository: `blakethebuilder/switchradar`.
4. Select the branch: `main`.

### 3. Build Configuration
1. For **Build Type**, you can choose either **"Docker"** or **"Docker Compose"**.
2. I have provided both a `Dockerfile` and a `docker-compose.yml` in the root. 
3. If using **Docker Compose**, Dokploy will use the `docker-compose.yml` which points to the `Dockerfile`.

### 4. Networking
1. Go to the **"Networking"** tab in your Dokploy application.
2. Set the **Destination Port** to `80` (as defined in the Dockerfile/Nginx).
3. (Optional) Set up your custom domain or use the auto-generated Dokploy domain.

### 5. Deployment
1. Click **"Deploy"**.
2. Wait for the build process to complete. You can monitor the progress in the **"Deployments"** tab.

## 📦 Container Details
- **Base Image**: `node:20-alpine` (Build) / `nginx:stable-alpine` (Runtime)
- **Port**: 80
- **SPA Routing**: Handled via `nginx.conf` (redirects all non-file requests to `index.html`).

## 🔄 Updating the App
Simply push your changes to your GitHub `main` branch. If you have "Auto Deploy" enabled in Dokploy, it will rebuild and redeploy automatically.
