
import { Routes, Route, Outlet, useNavigate } from '@solidjs/router';

import { Show, createEffect } from 'solid-js';
import { useClient } from './Client';
import NetworkView from './views/NetworkView';
import NetworkListView from './views/NetworkListView';
import LoginView from './views/LoginView';
import DefaultLayout from './layouts/Default.Layout';
import Loading from './views/Loading';


const RouteGuard = () => {
  const navigator = useNavigate();
  const { loading, authRequired } = useClient();

  createEffect(() => {
    if (authRequired()) {
      navigator('/login');
    }
  });

  return <Show when={!loading()} fallback={<Loading />}>
    <DefaultLayout><Outlet /></DefaultLayout>
  </Show>;
};


const App = () => {
  return (
    <Routes>
      <Route path="/login" component={LoginView} />
      <Route path="/" component={RouteGuard}>
        <Route path="/" component={NetworkListView} />
        <Route path="/network/:networkId" component={NetworkView} />
      </Route>
    </Routes>
  );
};

export default App;
