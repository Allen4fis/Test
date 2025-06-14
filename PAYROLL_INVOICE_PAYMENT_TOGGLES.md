# Payroll Invoice and Payment Status Toggles

## Feature Added

Added toggle controls to the Payroll Information section in Summary Reports to filter data by invoice and payment status.

## New Filtering Options

### Invoice Status Toggles

- **Include Invoiced**: Shows entries for dates that have been invoiced
- **Include Uninvoiced**: Shows entries for dates that have not been invoiced

### Payment Status Toggles

- **Include Paid**: Shows entries for dates that have been paid
- **Include Unpaid**: Shows entries for dates that have not been paid

## UI Implementation

### Toggle Controls

- Located in the filters section of the Payroll Information tab
- Organized in a 2-column grid layout:
  - Left column: Invoice Status toggles
  - Right column: Payment Status toggles
- Color-coded checkboxes:
  - Orange: Invoice status controls
  - Green: Paid status control
  - Red: Unpaid status control

### Default State

- All toggles are enabled by default (show all data)
- Users can selectively disable toggles to filter data

## Filtering Logic

### How It Works

1. **Data Source**: Uses `job.invoicedDates` and `job.paidDates` arrays from Job records
2. **Date Matching**: Compares entry/rental dates against invoiced/paid date arrays
3. **Inclusive Filtering**: Only shows entries that match selected criteria

### Applied To

- **Time Entries**: Labor costs and hours filtering
- **Rental Entries**: Equipment rental filtering
- **Summary Statistics**: Totals reflect filtered data

### Filter Combinations

Users can create specific views:

- **Invoiced but Unpaid**: Invoiced ✓, Uninvoiced ✗, Paid ✗, Unpaid ✓
- **Ready to Invoice**: Invoiced ✗, Uninvoiced ✓, Paid ✗, Unpaid ✓
- **Completed Work**: Invoiced ✓, Uninvoiced ✗, Paid ✓, Unpaid ✗

## Use Cases

### For Payroll Processing

- **Invoiced Work**: Show only work that's been billed to clients
- **Uninvoiced Work**: Show work that needs to be invoiced
- **Paid Work**: Show work where payment has been received

### For Cash Flow Management

- **Outstanding Receivables**: Invoiced but unpaid work
- **Work in Progress**: Uninvoiced work ready for billing
- **Completed Transactions**: Fully invoiced and paid work

### For Employee Reports

- **Billable vs Internal**: Filter by invoice status to separate billable work
- **Payment Status**: Track which work has generated revenue

## Technical Implementation

### State Management

```typescript
const [includeInvoiced, setIncludeInvoiced] = useState(true);
const [includeUninvoiced, setIncludeUninvoiced] = useState(true);
const [includePaid, setIncludePaid] = useState(true);
const [includeUnpaid, setIncludeUnpaid] = useState(true);
```

### Filtering Logic

```typescript
const isInvoiced = job?.invoicedDates.includes(entry.date) || false;
const isPaid = job?.paidDates.includes(entry.date) || false;

// Apply filters
if (!includeInvoiced && isInvoiced) return false;
if (!includeUninvoiced && !isInvoiced) return false;
if (!includePaid && isPaid) return false;
if (!includeUnpaid && !isPaid) return false;
```

## Files Modified

- `src/components/SummaryReports.tsx`
  - Added new state variables for toggle controls
  - Updated filtering logic for time entries and rentals
  - Added UI controls in filters section
  - Updated resetFilters function

## Benefits

✅ **Improved Cash Flow Visibility**: See exactly what work has been paid for  
✅ **Better Payroll Planning**: Filter by payment status for accurate costing  
✅ **Invoice Management**: Easily identify what needs to be invoiced  
✅ **Revenue Tracking**: Separate billed vs unbilled work  
✅ **Financial Accuracy**: More precise payroll cost calculations

## Future Enhancements

- Add the same functionality to SummaryReportsOptimized component
- Add preset filter combinations (e.g., "Ready to Invoice", "Outstanding Receivables")
- Add visual indicators for invoice/payment status in data tables
- Add summary statistics for each filter category

## Verification

✅ TypeScript compilation clean  
✅ Production build successful  
✅ Filtering logic covers both time entries and rentals  
✅ UI controls properly integrated with existing filter system  
✅ Reset filters function updated
