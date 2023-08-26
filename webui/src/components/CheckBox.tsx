import { Accessor } from 'solid-js';

export default (props: { 
  checked?: Accessor<boolean> | boolean, 
  onChange?: (value: boolean) => unknown,
  class?: string
}) => {
  return <input
    type="checkbox"
    checked={(props.checked instanceof Function ? props.checked?.() : props.checked) ?? false}
    onChange={e => props.onChange?.(e.target.checked)}
    class={`checkbox ${props.class ?? ''}`}
  />;
};
