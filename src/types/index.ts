export interface Employee {
  id: string;
  name: string;
  title: string;
  email?: string;
  billableWage: number; // What we charge clients
  costWage: number; // Internal cost/what we pay employee
  managerId?: string; // ID of the employee who manages this employee
  category?: string; // "employee", "dsp", or undefined for actual employee relationships
  createdAt: string;
}

export interface Job {
  id: string;
  jobNumber: string;
  name: string;
  description?: string;
  isActive: boolean;
  invoicedDates: string[]; // Array of dates in YYYY-MM-DD format
  paidDates: string[]; // Array of dates in YYYY-MM-DD format that have been paid
  createdAt: string;
}

export interface HourType {
  id: string;
  name: string;
  description?: string;
  multiplier: number; // 1.0 for regular, 1.5 for overtime, etc.
}

export interface Province {
  id: string;
  name: string;
  code: string; // AB, BC, ON, etc.
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  jobId: string;
  hourTypeId: string;
  provinceId: string;
  date: string; // YYYY-MM-DD format
  hours: number;
  loaCount?: number; // Live Out Allowance count as separate field (not hourly)
  title: string; // Employee title at time of entry
  billableWageUsed: number; // Billable wage at time of entry
  costWageUsed: number; // Cost wage at time of entry
  description?: string;
  createdAt: string;
}

export interface TimeEntrySummary {
  employeeName: string;
  employeeTitle: string;
  jobNumber: string;
  jobName: string;
  hourTypeName: string;
  provinceName: string;
  date: string;
  hours: number;
  effectiveHours: number; // hours * multiplier
  loaCount?: number; // Live Out Allowance count
  billableWage: number;
  costWage: number;
  totalBillableAmount: number; // effectiveHours * billableWage
  totalCost: number; // effectiveHours * costWage
}

export interface SummaryByTitleAndJob {
  title: string;
  jobNumber: string;
  jobName: string;
  totalHours: number;
  totalEffectiveHours: number;
  totalCost: number;
  entries: TimeEntry[];
}

export interface SummaryByDateAndName {
  date: string;
  employeeName: string;
  totalHours: number;
  totalEffectiveHours: number;
  totalLoaCount: number;
  totalCost: number;
  entries: TimeEntry[];
}

export interface CostSummaryByEmployee {
  employeeId: string;
  employeeName: string;
  employeeTitle: string;
  billableWage: number;
  costWage: number;
  totalHours: number;
  totalEffectiveHours: number;
  totalBillableAmount: number;
  totalCost: number;
  entries: TimeEntry[];
}

export interface CostSummaryByJob {
  jobId: string;
  jobNumber: string;
  jobName: string;
  totalHours: number;
  totalEffectiveHours: number;
  totalCost: number;
  employees: {
    employeeName: string;
    hours: number;
    effectiveHours: number;
    cost: number;
  }[];
  entries: TimeEntry[];
}

export interface RentalItem {
  id: string;
  name: string;
  description?: string;
  category: string; // e.g., "Equipment", "Tools", "Vehicles", "Materials"
  dailyRate: number;
  hourlyRate?: number;
  unit: "day" | "hour" | "week" | "month"; // Primary billing unit
  employeeId?: string; // Employee this rental item is attached to
  dspRate?: number; // DSP rate paid out to the employee
  isActive: boolean;
  createdAt: string;
}

export interface RentalEntry {
  id: string;
  rentalItemId: string;
  jobId: string;
  employeeId?: string; // Who rented/used the item
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  quantity: number; // Number of items rented
  billingUnit: "day" | "hour" | "week" | "month";
  rateUsed: number; // Rate that was used for this rental (in case rates change)
  dspRate?: number; // DSP rate for this rental entry
  description?: string;
  createdAt: string;
}

export interface RentalSummary {
  rentalItemName: string;
  category: string;
  jobNumber: string;
  jobName: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  duration: number; // Calculated duration in billing units
  quantity: number;
  rateUsed: number;
  dspRate?: number; // DSP rate for this rental
  totalCost: number;
}

export interface AppData {
  employees: Employee[];
  jobs: Job[];
  hourTypes: HourType[];
  provinces: Province[];
  timeEntries: TimeEntry[];
  rentalItems: RentalItem[];
  rentalEntries: RentalEntry[];
}
