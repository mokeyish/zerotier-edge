
import { Routes, Route } from '@solidjs/router';

import NetworkView from './views/NetworkView';
import NetworkListView from './views/NetworkListView';
import { useClient } from './Client';
import { Show } from 'solid-js';
import LoginView from './views/LoginView';


const App = () => {

  const { authRequired } = useClient();

  return (
    <div class="bg-base-100 absolute inset-0 overflow-y-auto">
      <Show when={!authRequired()} fallback={<LoginView />}>
        <div class="flex flex-col items-center p-6 mb-8 bg-neutral text-neutral-content">
          <div class="text-4xl">Manage Your Zerotier Networks</div>
        </div>

        <div class="max-w-7xl mx-auto">
          <div class="prose max-w-none ">
            <Routes>
              <Route path="/" component={NetworkListView} />
              <Route path="/network/:networkId" component={NetworkView} />
            </Routes>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default App;
