import { Accessor } from 'solid-js';

export default (props: {
  value?: Accessor<string> | string,
  onChange?: (value: string) => unknown,
  class?: string,
  placeholder?: string
}) => {
  return <textarea
    class={`textarea textarea-bordered ${props.class}`}
    value={(props.value instanceof Function ? props.value?.() : props.value) ?? ''}
    onChange={(e) => props.onChange?.(e.target.value)}
  />;
};