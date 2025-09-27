import { splitProps, type JSX } from 'solid-js';

export default (props: {
  min?: number,
  max?: number,
  value?: number,
  step?: number,
  onChange?: (value: number) => unknown,
} &
  Omit<JSX.InputHTMLAttributes<HTMLInputElement>,
    'min' | 'max' | 'step' | 'value' | 'onChange'>
) => {
  const [local, other] = splitProps(props, ['onChange']);
  return <input class="input input-bordered" type="number" {...other} onChange={e => local.onChange?.(parseInt(e.target.value))}/>;
};