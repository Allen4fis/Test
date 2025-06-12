# Autosave Verification Guide

## How Autosave Works

The autosave feature in 4Front Trackity-doo automatically saves your data every **10 minutes** to prevent data loss. The autosave now uses a **global persistent timer** that runs continuously while the application is open.

### Key Features:

- **Persistent timing**: Timer runs every 10 minutes from app start, never resets when switching tabs/sections
- **Global scope**: Single autosave system for the entire application
- **Change detection**: Only saves when data has actually changed
- **Multiple backups**: Stores the last 3 autosaves
- **Local storage**: Uses browser localStorage for persistence
- **Backup retention**: Keeps the last 3 autosaves

## How to Verify Autosave is Working

### 1. Check Console Logs

When the app loads, you should see these messages in the browser console:

- `🔄 Global autosave initialized: Every 10 minutes`
- `📅 Next autosave: [timestamp]`
- `✅ Global autosave completed at [timestamp]` (when data changes)
- `⏰ Autosave check: No changes detected, skipping save` (when no changes)

### 2. Check Dashboard System Status

On the Dashboard, look at the "System Status" section:

- Check "Last Autosave" time - should show the most recent save
- Time should update every 10 minutes when changes are made
- Shows "Never" if no autosaves have occurred yet

### 3. Navigation Test

**NEW**: The autosave timer no longer resets when switching between tabs/sections:

1. Open the application and note the "Next autosave" time in console
2. Switch between different tabs (Dashboard, Time Entry, Reports, etc.)
3. The timer should continue running without interruption
4. The next autosave should occur at the originally scheduled time

### 4. Test Autosave Debug Button

In the Dashboard System Status section:

- Click "Test Autosave" button in System Status section
- Check console for autosave status information

### 5. Check localStorage

1. Open browser Developer Tools (F12)
2. Go to Application tab > Local Storage
3. Look for key: `timeTrackingApp-autosave`
4. This contains the autosave backups

### 6. Force an Autosave Test

To trigger an autosave:

1. Make a change (add employee, time entry, etc.)
2. Wait for the 10-minute interval (or check console for exact timing)
3. Check console for autosave completion message
4. Verify localStorage was updated

## Autosave Data Structure

Each autosave contains:

- `timestamp`: When the save occurred
- `data`: Complete app data snapshot
- `hash`: Data fingerprint for change detection
- `manual`: Flag indicating if save was manually triggered

## Troubleshooting

### If autosave isn't working:

1. **Check console for errors**: Look for red error messages
2. **Verify localStorage space**: Browser might be out of storage
3. **Check timer status**: Look for "Global autosave initialized" message
4. **Test manual save**: Use the test button to verify basic functionality
5. **Clear browser cache**: Sometimes helps with localStorage issues

### Important Notes:

- Autosave only triggers when data actually changes
- Timer continues running even when switching between app sections
- If you close and reopen the app, the timer restarts from that point
- Multiple tabs of the same app will each have their own autosave timer

## Data Recovery

If data is lost, autosaves can be restored from localStorage under the `timeTrackingApp-autosave` key.

## Performance Impact

The global autosave system has minimal performance impact:

- Runs only every 10 minutes
- Uses efficient change detection
- Does not interfere with normal app usage
- Timer management is lightweight and persistent
