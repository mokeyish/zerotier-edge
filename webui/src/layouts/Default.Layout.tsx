import type { JSX } from 'solid-js';



export default (props: { children: JSX.Element }) => {
  return <div class="bg-base-100 absolute inset-0 overflow-y-auto">
    <div class="flex flex-col items-center p-6 mb-8 bg-neutral text-neutral-content">
      <div class="text-xl sm:text-4xl">Manage Your Zerotier Networks</div>
    </div>

    <div class="sm:max-w-8xl mx-auto">
      <div class="prose max-w-none ">
        {props.children}
      </div>
    </div>
  </div>;
};