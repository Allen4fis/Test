export interface Employee {
  id: string;
  name: string;
  title: string;
  email?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  jobNumber: string;
  name: string;
  description?: string;
  isActive: boolean;
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
}

export interface SummaryByTitleAndJob {
  title: string;
  jobNumber: string;
  jobName: string;
  totalHours: number;
  totalEffectiveHours: number;
  entries: TimeEntry[];
}

export interface SummaryByDateAndName {
  date: string;
  employeeName: string;
  totalHours: number;
  totalEffectiveHours: number;
  entries: TimeEntry[];
}

export interface AppData {
  employees: Employee[];
  jobs: Job[];
  hourTypes: HourType[];
  provinces: Province[];
  timeEntries: TimeEntry[];
}
