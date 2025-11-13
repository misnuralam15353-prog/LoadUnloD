export enum ReportType {
  Load = 'Load',
  Unload = 'Unload',
}

export interface StaffInfo {
  id: string;
  name: string;
  phone: string;
}

export interface StaffMember {
  id: string;
  name: string;
  title: string;
  phone: string;
}
