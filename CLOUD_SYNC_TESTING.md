# 🧪 Cloud Sync Testing Guide

## How to Test Manual Cloud Sync

### 🔧 Prerequisites
1. **Server Running**: Make sure your SwitchRadar server is running
2. **User Account**: Create a user account or use existing credentials
3. **Test Data**: Have some business data imported locally

### 📱 Testing Steps

#### **Step 1: Setup Test Environment**
```bash
# Start the server (if not already running)
cd SwitchRadar
npm run dev

# Or if using Docker
docker-compose up
```

#### **Step 2: Create Test Account**
1. Open SwitchRadar in browser
2. Click profile icon → Login
3. Register new account or use existing:
   - Username: `blake` / Password: `Smart@2026!`
   - Username: `Sean` / Password: `Smart@2026!`
   - Username: `Jarred` / Password: `Smart@2026!`

#### **Step 3: Import Test Data**
1. Click "Import Data" button
2. Upload your Excel/CSV file (e.g., `Pretoria big.xlsx`)
3. Map columns correctly
4. Confirm import
5. Verify data appears in table/map

#### **Step 4: Test Upload to Cloud**
1. Click profile icon → Settings
2. Find "Manual Database Sync" panel
3. Click "Refresh" to check cloud stats
4. Click "📤 Upload to Cloud"
5. Wait for success message
6. Click "Refresh" again to verify cloud data count

#### **Step 5: Test Multi-Device Access**
1. **Option A - Same Browser**: Open incognito/private window
2. **Option B - Different Device**: Open on phone/tablet
3. **Option C - Different Browser**: Use Chrome, Firefox, Safari, etc.

#### **Step 6: Test Download from Cloud**
1. In new session, login with same account
2. Go to Settings → Manual Database Sync
3. Click "Refresh" to see cloud data
4. Click "📥 Download from Cloud"
5. Verify data appears in table/map

#### **Step 7: Test Data Management**
1. **Replace Local**: Click "🔄 Replace Local with Cloud Data"
2. **Clear Cloud**: Click "🗑️ Clear Cloud DB" (with confirmation)
3. **Clear Local**: Click "🗑️ Clear Local DB" (with confirmation)
4. **Export Backup**: Click "💾 Export Backup" (downloads JSON file)

### 🔍 What to Look For

#### **✅ Success Indicators**
- Green success messages after each operation
- Cloud stats update correctly (business count, last sync time)
- Data appears/disappears as expected
- No error messages in browser console
- Smooth loading states during operations

#### **❌ Potential Issues**
- Red error messages
- 401 Unauthorized errors (check login)
- Database errors (use Reset Database button)
- Network timeouts (check server connection)
- Data not syncing (verify user is logged in)

### 🛠️ Troubleshooting

#### **Authentication Issues**
```
Error: 401 Unauthorized
Solution: Make sure you're logged in and token is valid
```

#### **Database Issues**
```
Error: DatabaseClosedError
Solution: Click "Reset Database" button in error screen
```

#### **Network Issues**
```
Error: Failed to fetch
Solution: Check server is running on correct port
```

#### **Large Dataset Issues**
```
Error: Request timeout
Solution: Try smaller datasets first, then gradually increase
```

### 📊 Test Scenarios

#### **Scenario 1: Basic Sync**
1. Import 100 businesses
2. Upload to cloud
3. Clear local data
4. Download from cloud
5. Verify all 100 businesses returned

#### **Scenario 2: Multi-Device Workflow**
1. Device A: Import data, upload to cloud
2. Device B: Login, download from cloud
3. Device B: Add more data, upload to cloud
4. Device A: Download from cloud
5. Verify both devices have all data

#### **Scenario 3: Data Management**
1. Import Dataset A (1000 businesses)
2. Upload to cloud
3. Import Dataset B (2000 businesses) 
4. Replace local with cloud data
5. Verify only Dataset A (1000) remains

#### **Scenario 4: Error Recovery**
1. Import large dataset
2. Disconnect internet
3. Try to upload (should show error)
4. Reconnect internet
5. Try upload again (should succeed)

### 🎯 Expected Performance

#### **Small Datasets (< 1000 records)**
- Upload: < 5 seconds
- Download: < 3 seconds
- UI updates: Instant

#### **Medium Datasets (1000-5000 records)**
- Upload: 5-15 seconds
- Download: 3-10 seconds
- UI updates: < 2 seconds

#### **Large Datasets (5000+ records)**
- Upload: 15-60 seconds
- Download: 10-30 seconds
- UI updates: 2-5 seconds

### 📝 Test Checklist

- [ ] User registration/login works
- [ ] Data import works without errors
- [ ] Upload to cloud succeeds
- [ ] Cloud stats update correctly
- [ ] Download from cloud works
- [ ] Data appears correctly after download
- [ ] Replace local with cloud works
- [ ] Clear cloud database works
- [ ] Clear local database works
- [ ] Export backup downloads file
- [ ] Multi-device sync works
- [ ] Error messages are user-friendly
- [ ] Loading states show during operations
- [ ] No console errors during normal operation

### 🚀 Production Testing

For production testing on `https://map.smartintegrate.co.za`:

1. Use real user accounts
2. Test with actual business datasets
3. Verify HTTPS connections work
4. Test on mobile devices
5. Check performance with large datasets
6. Verify data persistence across sessions

---

**Need Help?** Check the browser console for detailed error messages and network requests.