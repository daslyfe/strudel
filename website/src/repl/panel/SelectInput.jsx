import React from 'react';
//      value: ?ID, options: Map<ID, any>, onChange: ID => null, onClick: event => void
export function SelectInput({ value, options, onChange, onClick }) {
  return (
    <select
      onClick={onClick}
      className="p-2 bg-background rounded-md text-foreground"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.size == 0 && <option value={value}>{`${value ?? 'select an option'}`}</option>}
      {Array.from(options.keys()).map((id) => (
        <option key={id} className="bg-background" value={id}>
          {options.get(id)}
        </option>
      ))}
    </select>
  );
}
