import { Building2, CircleGauge, FileStack, Handshake, Hospital } from 'lucide-react';

export const navigationRoutes = [
  {
    path: '/',
    label: 'Dashboard',
    icon: CircleGauge,
  },
  {
    path: '/customer',
    label: 'Customer',
    icon: FileStack,
  },
  {
    path: '/client',
    label: 'Client',
    icon: Building2,
  },
  {
    path: '/fmg',
    label: 'FMG',
    icon: Handshake,
  },
  {
    path: '/carrier',
    label: 'Carrier',
    icon: Hospital,
  },
];
