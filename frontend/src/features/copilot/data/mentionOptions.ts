import type { LucideIcon } from 'lucide-react';
import { Camera, HardHat, MapPin, Radio, FileText } from 'lucide-react';

export type MentionCategory = 'Zone' | 'Worker' | 'Permit' | 'Sensor' | 'Camera';

export interface MentionOption {
  id: string;
  category: MentionCategory;
  /** Inserted into the message text after "@", e.g. "@Tank Farm A-12". */
  label: string;
}

/** Icon shown per category in the mention dropdown. UI-only — matches no live data source. */
export const MENTION_CATEGORY_ICON: Record<MentionCategory, LucideIcon> = {
  Zone: MapPin,
  Worker: HardHat,
  Permit: FileText,
  Sensor: Radio,
  Camera: Camera,
};

/**
 * Static starter options for the `@` mention autocomplete — UI only, no
 * backend lookup. Grouped by category so the dropdown can show "Zone",
 * "Worker", "Permit", "Sensor", "Camera" sections as the user types.
 */
export const MENTION_OPTIONS: MentionOption[] = [
  { id: 'zone-tank-farm-a12', category: 'Zone', label: 'Tank Farm A-12' },
  { id: 'zone-loading-bay-3', category: 'Zone', label: 'Loading Bay 3' },
  { id: 'zone-compressor-house', category: 'Zone', label: 'Compressor House' },

  { id: 'worker-r-shah', category: 'Worker', label: 'R. Shah' },
  { id: 'worker-a-mehta', category: 'Worker', label: 'A. Mehta' },
  { id: 'worker-k-verma', category: 'Worker', label: 'K. Verma' },

  { id: 'permit-hw-2291', category: 'Permit', label: 'Hot Work Permit #2291' },
  { id: 'permit-cs-1187', category: 'Permit', label: 'Confined Space Permit #1187' },

  { id: 'sensor-gas-12', category: 'Sensor', label: 'Gas Sensor GS-12' },
  { id: 'sensor-pressure-04', category: 'Sensor', label: 'Pressure Sensor P-04' },

  { id: 'camera-cam-07', category: 'Camera', label: 'CAM-07 · Tank Farm' },
  { id: 'camera-cam-14', category: 'Camera', label: 'CAM-14 · Loading Bay' },
];
