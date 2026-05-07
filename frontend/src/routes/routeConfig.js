import { Building2, CircleGauge, FileStack, Handshake, Hospital, ShieldCheck, ClipboardList, ShieldAlert } from 'lucide-react';
import { USER_ROLES } from '../constants/appConstants.js';

export const navigationRoutes = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: CircleGauge,
    end: true,
    roles: Object.values(USER_ROLES),
  },
  {
    path: '/customer',
    label: 'Policies & Catalog',
    icon: ShieldCheck,
    end: true,
    roles: [USER_ROLES.CUSTOMER],
  },
  {
    path: '/customer/claims',
    label: 'My Claims',
    icon: FileStack,
    end: true,
    roles: [USER_ROLES.CUSTOMER],
  },
  {
    path: '/client',
    label: 'Policy Verification',
    icon: ClipboardList,
    end: true,
    roles: [USER_ROLES.CLIENT],
  },
  {
    path: '/carrier',
    label: 'Carrier Management',
    icon: Building2,
    end: true,
    roles: [USER_ROLES.CARRIER],
  },
  {
    path: '/fmg',
    label: 'Claim Audits',
    icon: ShieldAlert,
    end: true,
    roles: [USER_ROLES.FMG],
  },
];
