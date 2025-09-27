import { JSX } from 'solid-js';

export default (props: { legend?: string, children: JSX.Element }) => {
  return <fieldset class="rounded-md p-4 border-2 border-white/25 neutral-content">
    <legend class="font-bold">&nbsp;{props.legend}&nbsp;</legend>
    {props.children}
  </fieldset>;
};
