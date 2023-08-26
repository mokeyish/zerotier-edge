import { JSX } from 'solid-js';

export default (props: { legend?: string, children: JSX.Element }) => {
  return <fieldset class="p-4 border-2 neutral-content">
    <legend class="font-bold">{props.legend}</legend>
    {props.children}
  </fieldset>;
};
