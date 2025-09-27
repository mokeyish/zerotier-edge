import type { JSX } from 'solid-js';

import logo from '../Logo';



export default (props: { children: JSX.Element }) => {
  return <div class="bg-base-100 absolute inset-0 overflow-y-auto">
    {<div class="flex flex-col items-center p-6 mb-8 bg-neutral text-neutral-content">
      {logo}
    </div>}

    <div class="sm:max-w-8xl mx-auto">
      <div class="prose max-w-none ">
        {props.children}
      </div>
    </div>
  </div>;
};