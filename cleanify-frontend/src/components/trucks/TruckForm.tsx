import React from 'react';
import { TruckFormData } from '@/types';

interface Props {
  data: TruckFormData;
  onChange: (data: TruckFormData) => void;
}

const TruckForm: React.FC<Props> = ({ data, onChange }) => (
  <form className="space-y-2">
    <input
      value={data.id}
      onChange={e => onChange({ ...data, id: e.target.value })}
      placeholder="ID"
      className="border px-2"
    />
  </form>
);

export default TruckForm;