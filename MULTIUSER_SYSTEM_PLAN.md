# Multi-User System Implementation Plan

## Current Architecture
- **Client-side only** application using IndexedDB for local storage
- **Single-user** per browser/device
- **No server-side database** or user management
- **Local authentication** with simple token storage

## Multi-User Requirements

### 1. Backend Infrastructure
- **Node.js/Express API** server
- **PostgreSQL/MySQL** database
- **Redis** for session management (optional)
- **JWT authentication** system
- **RESTful API** endpoints

### 2. Database Schema
```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Businesses table (shared across users)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  town VARCHAR(100),
  province VARCHAR(100),
  category VARCHAR(100),
  status VARCHAR(50),
  coordinates JSONB,
  metadata JSONB,
  rich_notes JSONB,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User routes (personal to each user)
CREATE TABLE user_routes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  business_id UUID REFERENCES businesses(id),
  order_index INTEGER,
  added_at TIMESTAMP DEFAULT NOW()
);

-- User permissions/access control
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  resource VARCHAR(50),
  action VARCHAR(50),
  granted BOOLEAN DEFAULT true
);
```

### 3. API Endpoints
```
Authentication:
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me

Businesses:
GET    /api/businesses
POST   /api/businesses
PUT    /api/businesses/:id
DELETE /api/businesses/:id
GET    /api/businesses/search?q=term

Routes:
GET    /api/routes
POST   /api/routes
PUT    /api/routes/:id
DELETE /api/routes/:id

Users (Admin only):
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### 4. Frontend Changes Required

#### Authentication
- Replace local auth with API-based authentication
- Add proper login/register forms
- Implement token refresh mechanism
- Add role-based UI components

#### Data Management
- Replace IndexedDB with API calls
- Implement data synchronization
- Add offline support with sync when online
- Handle concurrent editing conflicts

#### Real-time Features (Optional)
- WebSocket connection for live updates
- Real-time collaboration on routes
- Live business data updates
- User presence indicators

### 5. Deployment Requirements

#### VPS Specifications (Dokploy)
- **RAM**: 4GB minimum (8GB recommended for production)
- **Storage**: 50GB+ SSD
- **CPU**: 2-4 cores
- **Bandwidth**: Unlimited or high limit

#### Software Stack
- **Node.js**: v18+ 
- **PostgreSQL**: v14+
- **Nginx**: Reverse proxy
- **PM2**: Process manager
- **Docker**: Containerization (optional)

#### Environment Setup
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/switchradar
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# API
PORT=3001
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://yourdomain.com
```

### 6. Migration Strategy

#### Phase 1: Backend Setup
1. Create Node.js API server
2. Set up PostgreSQL database
3. Implement authentication system
4. Create basic CRUD endpoints

#### Phase 2: Frontend Integration
1. Add API service layer
2. Replace local storage with API calls
3. Update authentication flow
4. Test data synchronization

#### Phase 3: Advanced Features
1. Add real-time updates
2. Implement offline support
3. Add user management
4. Performance optimization

#### Phase 4: Production Deployment
1. Set up production environment
2. Configure SSL certificates
3. Set up monitoring and logging
4. Performance testing and optimization

### 7. Security Considerations
- **Password hashing** with bcrypt
- **JWT token** security and rotation
- **Rate limiting** on API endpoints
- **Input validation** and sanitization
- **SQL injection** prevention
- **CORS** configuration
- **HTTPS** enforcement

### 8. Estimated Timeline
- **Phase 1**: 2-3 weeks (Backend setup)
- **Phase 2**: 2-3 weeks (Frontend integration)
- **Phase 3**: 1-2 weeks (Advanced features)
- **Phase 4**: 1 week (Production deployment)

**Total**: 6-9 weeks for full implementation

### 9. Cost Considerations
- **VPS hosting**: $20-50/month
- **Database**: Included with VPS
- **SSL certificate**: Free (Let's Encrypt)
- **Domain**: $10-15/year
- **Monitoring tools**: $0-20/month

### 10. Backup Strategy
- **Database backups**: Daily automated backups
- **File backups**: Weekly full backups
- **Version control**: Git repository backups
- **Disaster recovery**: Documented procedures

---

## Implementation Priority
1. **High**: Authentication system and basic CRUD
2. **Medium**: Real-time updates and offline support
3. **Low**: Advanced user management and analytics

## Notes
- Start with MVP (minimum viable product) approach
- Focus on core functionality first
- Add advanced features incrementally
- Ensure data migration path from current local storage
- Consider using existing solutions like Supabase or Firebase for faster implementation

---

**Status**: Planning phase - Not yet implemented
**Next Steps**: Evaluate if multi-user system is needed based on usage patterns
**Alternative**: Consider using cloud sync for single-user multi-device access first