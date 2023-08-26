import { Accessor, JSX, splitProps } from 'solid-js';

export default (props: {
  value?: Accessor<string> | string,
  onChange?: (value: string) => unknown,
  class?: string,
  placeholder?: string
} & Pick<JSX.CustomEventHandlersCamelCase<HTMLInputElement>, 'onKeyPress' | 'onBlur' | 'onInput'>) => {
  const [local, other] = splitProps(props, ['value', 'onChange', 'placeholder', 'class']);
  return <input
    type="text"
    value={(local.value instanceof Function ? local.value?.() : local.value) ?? ''}
    onChange={e => local.onChange?.(e.target.value)}
    placeholder={local.placeholder}
    class={`input input-bordered ${local.class ?? ''}`}
    {...other}
  />;
};