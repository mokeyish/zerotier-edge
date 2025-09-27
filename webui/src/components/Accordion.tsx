import { Icon } from '@iconify-icon/solid';
import { JSX, Show, createSignal } from 'solid-js';


export default (props: {
  checked?: boolean,
  header: JSX.Element,
  children: JSX.Element,
  onChange?: (checked: boolean) => unknown
}) => {
  const [checked, setChecked] = createSignal(props.checked ?? false);

  return <div class="rounded-md">
    <div
      class="p-3 font-bold cursor-pointer select-none bg-neutral text-neutral-content rounded-md  "
      classList={{
        'pb-4': checked(),
        'rounded-b-none': checked()
      }}
      onClick={() => setChecked((prev) => {
        props.onChange?.(!prev);
        return !prev;
      })}>
      <label class="swap text-primary mr-1">
        <input type="checkbox" checked={checked()} />
        <Icon icon="fa6-solid:angle-right" class="swap-off" />
        <Icon icon="fa6-solid:angle-down" class="swap-on" />
      </label>
      {props.header}
    </div>

    <Show when={checked()}>
      <div class="card px-4 bg-base-200 -mt-2">
        <div class="card-body">
          {props.children}
        </div>
      </div>
    </Show>
  </div>;
};
