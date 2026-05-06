import { Building2, CircleGauge, FileStack, Handshake, Hospital } from 'lucide-react';
import { USER_ROLES } from '../constants/appConstants.js';

export const navigationRoutes = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: CircleGauge,
    roles: Object.values(USER_ROLES),
  },
  {
    path: '/customer',
    label: 'Customer',
    icon: FileStack,
    roles: [USER_ROLES.CUSTOMER],
  },
  {
    path: '/client',
    label: 'Client',
    icon: Building2,
    roles: [USER_ROLES.CLIENT],
  },
  {
    path: '/fmg',
    label: 'FMG',
    icon: Handshake,
    roles: [USER_ROLES.FMG],
  },
  {
    path: '/carrier',
    label: 'Carrier',
    icon: Hospital,
    roles: [USER_ROLES.CARRIER],
  },
];
