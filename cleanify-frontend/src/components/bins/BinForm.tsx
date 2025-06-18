import React from 'react';
import { BinFormData } from '@/types';

interface Props {
  data: BinFormData;
  onChange: (data: BinFormData) => void;
}

const BinForm: React.FC<Props> = ({ data, onChange }) => (
  <form className="space-y-2">
    <input
      value={data.id}
      onChange={e => onChange({ ...data, id: e.target.value })}
      placeholder="ID"
      className="border px-2"
    />
  </form>
);

export default BinForm;