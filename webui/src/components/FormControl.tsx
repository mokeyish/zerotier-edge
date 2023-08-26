import { JSX, Show } from 'solid-js';

export default (props: {
  label?: string | JSX.Element,
  children: JSX.Element,
  class?: string,
  orientation?: 'vertical' | 'horizontal'
}) => {
  const orientation = () => props.orientation;

  return <div
    class={`form-control ${props.class ?? ''}`}
    classList={{
      flex: !!orientation(),
      'flex-col': orientation() === 'vertical',
      'flex-row': orientation() === 'horizontal',

    }}>
    <Show when={props.label}>
      <label class="label">
        <span class="label-text">{props.label ?? ''}</span>
      </label>

    </Show>
    {props.children}
  </div>;
};
