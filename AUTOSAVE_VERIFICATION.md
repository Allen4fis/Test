# Autosave Verification Guide

## How Autosave Works

The autosave feature in 4Front Trackity-doo automatically saves your data every **10 minutes** to prevent data loss.

### Key Features:

- **Automatic saves**: Every 10 minutes
- **Change detection**: Only saves when data has actually changed
- **Manual save**: Click "SAVE NOW" button anytime
- **Backup retention**: Keeps the last 3 autosaves
- **Storage location**: Browser's localStorage

## How to Verify Autosave is Working

### 1. Check Console Logs

Open browser developer tools (F12) and look for these messages:

- `��� Autosave initialized: Every 10 minutes`
- `📅 Next autosave: [timestamp]`
- `✅ Autosave completed at [timestamp]` (when data changes)
- `⏰ Autosave check: No changes detected, skipping save` (when no changes)

### 2. Check Dashboard Display

- Go to Dashboard
- Look at "System Status" section
- Check "Last Autosave" time - should show the most recent save

### 3. Test Manual Save

- Click the "SAVE NOW" button in the top-right corner
- You should see a success toast notification
- Console should show: `✅ Manual save completed at [timestamp]`

### 4. Test Autosave Debug Button

- Go to Dashboard
- Click "Test Autosave" button in System Status section
- Check console for autosave status information

### 5. Check Browser Storage

1. Open Developer Tools (F12)
2. Go to Application tab > Local Storage
3. Look for key: `timeTrackingApp-autosave`
4. This contains the autosave backups

### 6. Force an Autosave Test

To trigger an autosave:

1. Make any data change (add employee, time entry, etc.)
2. Wait up to 10 minutes
3. Check console for autosave completion message
4. Or click "SAVE NOW" for immediate save

## Autosave Data Structure

Each autosave contains:

- `timestamp`: When the save occurred
- `data`: Complete app data snapshot
- `hash`: Data fingerprint for change detection
- `manual`: True if triggered by "SAVE NOW" button

## Troubleshooting

### If autosave isn't working:

1. Check browser console for error messages
2. Verify localStorage is available and not full
3. Try manual save to test the save mechanism
4. Check if browser is blocking localStorage

### Manual save fails:

- Browser storage might be full
- Privacy settings blocking localStorage
- Browser extension interference

## Recovery

If data is lost, autosaves can be restored from localStorage under the `timeTrackingApp-autosave` key.
