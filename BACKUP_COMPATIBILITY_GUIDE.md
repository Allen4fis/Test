# Backup Compatibility Guide

## Overview

This document describes the backup compatibility system implemented in the Time Tracking application to ensure that backups created now will always be restorable in future versions of the application.

## Version History

### v1.0.0 (Current)

- **Initial versioned backup format**
- Includes all current data types: employees, jobs, timeEntries, rentalItems, rentalEntries, hourTypes, provinces
- Implements full backward compatibility system
- Migration framework for future updates

### Legacy (Pre-v1.0.0)

- Original backup format without versioning
- Automatically migrated to v1.0.0 when loaded
- Fully supported and backward compatible

## Backup Structure

### Current Versioned Backup Format (v1.0.0+)

```typescript
interface VersionedStoredBackup {
  // Metadata
  id: string; // Unique backup identifier
  name: string; // User-provided backup name
  description?: string; // Optional description
  timestamp: string; // ISO timestamp when backup was created
  version: string; // Backup format version (e.g., "1.0.0")
  appVersion?: string; // Application version when backup was created
  dataSize: number; // Size of backup data in bytes

  // Migration tracking
  migratedFrom?: string; // Original version if migrated
  migrationTimestamp?: string; // When migration occurred

  // Record counts for validation
  recordCounts: {
    employees: number;
    jobs: number;
    timeEntries: number;
    rentalItems: number;
    rentalEntries: number;
    hourTypes: number;
    provinces: number;
  };

  // Actual application data
  data: AppData;
}
```

### Data Structure (AppData)

```typescript
interface AppData {
  employees: Employee[]; // Employee records
  jobs: Job[]; // Job/project records
  timeEntries: TimeEntry[]; // Time tracking entries
  rentalItems: RentalItem[]; // Equipment/rental items
  rentalEntries: RentalEntry[]; // Rental usage records
  hourTypes: HourType[]; // Hour types (regular, overtime, etc.)
  provinces: Province[]; // Province/tax information
}
```

## Backward Compatibility Guarantees

### 🔒 **CRITICAL COMMITMENTS**

1. **All backups created from v1.0.0 onwards will ALWAYS be restorable**
2. **No existing field will ever be removed or renamed**
3. **No existing data structure will be changed in an incompatible way**
4. **Migration logic will never be removed or modified**

### Migration Strategy

When the application detects an older backup format:

1. **Detection**: Version is detected from the backup metadata
2. **Validation**: Backup structure is validated for integrity
3. **Migration**: Data is automatically migrated to current format
4. **Tracking**: Migration history is preserved in the backup metadata
5. **Restore**: Migrated data is safely restored to the application

## Future Version Guidelines

### ✅ **SAFE CHANGES** (Will maintain compatibility)

- **Adding new optional fields** to existing data types
- **Adding new data types** to AppData
- **Adding new metadata fields** to backup structure
- **Improving validation logic**
- **Optimizing migration performance**

### ❌ **BREAKING CHANGES** (Never allowed)

- **Removing existing fields** from any data type
- **Renaming existing fields** in any data type
- **Changing data types** of existing fields
- **Removing data types** from AppData
- **Modifying existing migration functions**
- **Removing version history entries**

### 📝 **REQUIRED STEPS** for new versions

1. **Add new version** to `BACKUP_VERSION_HISTORY` array
2. **Create migration function** from previous version
3. **Update `CURRENT_BACKUP_VERSION`** constant
4. **Add comprehensive tests** for migration
5. **Update documentation** with changes
6. **Never remove old migration functions**

## Example Migration Implementation

```typescript
// Example: Adding a new field in v1.1.0
function migrate1_0_0To1_1_0(
  backup: VersionedStoredBackup,
): VersionedStoredBackup {
  const migratedData = {
    ...backup.data,
    // Add new optional field with sensible default
    employees: backup.data.employees.map((employee) => ({
      ...employee,
      newOptionalField: employee.newOptionalField || "default_value",
    })),
  };

  return {
    ...backup,
    version: "1.1.0",
    data: migratedData,
    migratedFrom: backup.version,
    migrationTimestamp: new Date().toISOString(),
  };
}
```

## Validation and Safety Checks

The system includes multiple validation layers:

### 1. **Structure Validation**

- Ensures all required fields are present
- Validates data types and array structures
- Checks for corrupted or malformed data

### 2. **Compatibility Checks**

- Verifies backup can be safely restored
- Identifies potential data conflicts
- Provides warnings for migrated backups

### 3. **Integrity Verification**

- Validates record counts match actual data
- Checks for orphaned references
- Ensures data consistency

## Error Handling

### Backup Loading Errors

- **Corrupted data**: Skip invalid backups, continue with valid ones
- **Version conflicts**: Automatic migration with user notification
- **Missing fields**: Apply default values where possible

### Restore Errors

- **Incompatible backup**: Clear error message with specific issues
- **Migration failures**: Detailed error reporting with recovery options
- **Data validation**: Pre-restore compatibility checks

## Storage and Performance

### Storage Optimization

- **Compression**: JSON data is stored efficiently
- **Cleanup**: Automatic removal of oldest backups (keeping 20 most recent)
- **Validation**: Invalid backups are filtered out during loading

### Performance Considerations

- **Lazy loading**: Backups are loaded on-demand
- **Efficient migration**: Migrations only run when necessary
- **Caching**: Migrated backups are cached to avoid re-migration

## Developer Guidelines

### When Adding New Features

1. **Design for compatibility**: Always make new fields optional
2. **Provide defaults**: Ensure old data works with new fields
3. **Test thoroughly**: Verify migration with real backup data
4. **Document changes**: Update this guide with new requirements

### When Modifying Existing Features

1. **Never break compatibility**: Use additive changes only
2. **Deprecate gradually**: Mark old patterns as deprecated before removal
3. **Provide migration path**: Always offer a way to upgrade data
4. **Maintain tests**: Keep all existing migration tests working

## Testing Backup Compatibility

### Manual Testing Checklist

- [ ] Create backup with current version
- [ ] Restore backup successfully
- [ ] Create backup with new features
- [ ] Restore old backup in new version
- [ ] Verify migrated backup shows correct version info
- [ ] Check all data types are preserved
- [ ] Validate record counts are accurate

### Automated Testing

The system includes automated tests for:

- Backup structure validation
- Migration logic verification
- Data integrity checks
- Version detection accuracy
- Error handling scenarios

## Troubleshooting

### Common Issues

**"Backup format not recognized"**

- Solution: Check if backup was created with a newer version
- Verify backup file is not corrupted

**"Migration failed"**

- Solution: Check console for specific error details
- Verify all required fields are present in source data

**"Data validation errors"**

- Solution: Examine backup data for missing or invalid fields
- Check if backup was manually modified

### Recovery Strategies

1. **Partial restore**: Extract individual data types from backup
2. **Manual migration**: Convert data format manually if needed
3. **Data recovery**: Use previous backup versions if available

## Contact and Support

For questions about backup compatibility or migration issues:

1. **Check this documentation** first
2. **Review error messages** for specific guidance
3. **Test with sample data** before using production backups
4. **Keep multiple backup versions** for safety

---

**Remember**: The goal is to ensure that any backup created today will be restorable 5+ years from now, regardless of how much the application evolves.
