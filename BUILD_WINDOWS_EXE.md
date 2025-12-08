# Building TimeTracker Windows Executable

This guide explains how to build the TimeTracker application as a standalone Windows executable (.EXE).

## Prerequisites

Before building, ensure you have:

1. **Node.js & npm** - Download from [nodejs.org](https://nodejs.org) (LTS version recommended)
2. **Windows 10 or newer** - Required for building Windows executables
3. **Windows Build Tools** (optional but recommended)
   - For better compatibility, install: `npm install --global windows-build-tools`

## Build Steps

### Step 1: Install Dependencies

```bash
npm install
```

This installs all required dependencies including Electron and electron-builder.

### Step 2: Build for Development (Optional)

To test the app in Electron before building the final .EXE:

```bash
npm run dev:electron
```

This will start the development server and open the app in Electron. You can test the app locally and verify everything works before creating the final build.

### Step 3: Build the Windows Executable

To create the final Windows .EXE file:

```bash
npm run build:electron
```

This command will:
1. Build the React app for production (`npm run build`)
2. Generate the Windows installer (.EXE) and portable executable using electron-builder

### Step 4: Find Your Executable

After the build completes, look for the generated files in:

```
code/dist/
```

The Windows executable files will be in:
- **Installer**: `dist/TimeTracker Setup X.X.X.exe` - Full installer with uninstaller
- **Portable**: `dist/TimeTracker X.X.X.exe` - Standalone executable (no installation required)

## What's Inside

The Windows executable includes:

- ✅ **Local file-system storage** - All data saved locally on your computer
- ✅ **Automatic backups** - Create and restore backups
- ✅ **No cloud dependency** - Complete offline operation
- ✅ **Full functionality** - All features of the web version

## Storage Location

Data is stored in:

```
C:\Users\[YourUsername]\AppData\Roaming\TimeTracker\
```

In this directory you'll find:
- `*.json` files - Your app data
- `backups/` folder - Your backup files

## Troubleshooting

### Build Fails with "node-gyp" errors

```bash
npm install --global windows-build-tools
```

Then try building again.

### "electron not found" error

Make sure you ran `npm install` first. If the issue persists:

```bash
npm install --save-dev electron electron-builder
```

### Antivirus/Windows Defender Warning

The executable is unsigned, so Windows SmartScreen may warn you. This is normal for unsigned applications. Click "More info" > "Run anyway" to proceed.

To remove this warning, you would need to obtain a code signing certificate (paid service).

### Build is Very Slow

First build takes longer as it downloads Electron. Subsequent builds are faster. Make sure you have at least 2GB free disk space.

## Distribution

Once built, you can:

1. **Share the installer** - Distribute `TimeTracker Setup X.X.X.exe` to others
2. **Host for download** - Upload to Google Drive, Dropbox, or your server
3. **Email** - Attach the portable `.exe` directly

## Updating the App

When you make changes to the code:

1. Make your code changes
2. Run `npm run build:electron` again
3. Share the new `.exe` file

Data from old versions automatically loads in new versions.

## Advanced: Customization

### Change App Name

Edit `package.json`:

```json
{
  "build": {
    "productName": "My Custom App Name"
  }
}
```

### Add App Icon

Create a 256x256 PNG image and place it at:
```
assets/icon.png
```

Then rebuild.

### Change Installer Behavior

Modify the `nsis` settings in `package.json`:

```json
{
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

## Support

If you encounter issues:

1. Check that all dependencies are installed: `npm install`
2. Ensure Node.js version is compatible: `node --version`
3. Clear cache: `npm cache clean --force`
4. Try building again from scratch

## Technical Details

This app uses:

- **React 18** - UI framework
- **Electron** - Desktop application framework
- **File System Storage** - Local data persistence
- **electron-builder** - Build and packaging tool

All data is stored locally on your computer with no external services required.
