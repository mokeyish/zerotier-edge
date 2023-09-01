import { createEffect, createSignal } from 'solid-js';
import { useClient } from '../Client';
import FormControl from '../components/FormControl';
import Logo from '../Logo';
import { useNavigate } from '@solidjs/router';



export default () => {
  const navigate = useNavigate();
  const [token, setToken] = createSignal('');
  const { login: innerLogin, authRequired } = useClient();

  const login = () => innerLogin(token());

  createEffect(() => {
    if (!authRequired()) {
      navigate('/');
    }
  });

  return <div>
    <div class="hero min-h-screen bg-base-200">
      <div class="hero-content flex-col lg:flex-row-reverse">
        <div class="card flex-shrink-0 w-96 max-w-sm shadow-2xl bg-base-100">
          <div class="card-body">
            <div class="my-6">
              <Logo />
              <div class="mt-3 text-xs indent-6 opacity-50 hover:opacity-100">Manage your self-hosted ZeroTier network controller.</div>
            </div>
            <FormControl label="Access Token">
              <div>
                <input type="password" value={token()} class="input input-bordered w-full" onChange={e => setToken(e.target.value.trim())} />

                <div class="flex justify-end mt-3">
                  <a class="link link-primary text-sm" href="https://docs.zerotier.com/self-hosting/network-controllers/#authtoken" target="__blank">Get your token?</a></div>
              </div>
            </FormControl>
            <div class="form-control mt-3">
              <button class="btn btn-primary" onClick={login}>Login</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
};