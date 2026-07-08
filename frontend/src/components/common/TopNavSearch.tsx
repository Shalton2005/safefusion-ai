import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui';

export function TopNavSearch() {
  const [value, setValue] = useState('');

  return (
    <Input
      aria-label="Search"
      placeholder="Search…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      leftAddon={<Search className="w-4 h-4" />}
      fieldSize="sm"
      className="bg-[var(--sf-surface-sunken)]"
    />
  );
}
