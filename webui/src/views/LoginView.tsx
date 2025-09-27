import { createEffect, createSignal } from 'solid-js';
import { useClient } from '../Client';
import FormControl from '../components/FormControl';
import Logo from '../components/Logo';
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

  const auth_token = <div>
    <span class="font-bold">Auth Token </span> 
      <a class="link link-primary text-sm" href="https://docs.zerotier.com/self-hosting/network-controllers/#authtoken" target="__blank">?</a>
  </div>

  return <div>
    <div class="hero absolute inset-0 bg-base-200">
      <div class="hero-content flex-col lg:flex-row-reverse">
        <div class="card flex-shrink-0 max-w-sm bg-base-100">
          <div class="card-body">
            <div class="py-6">
              <Logo />
              <div class="mt-3 text-xs opacity-50 hover:opacity-100 italic">manage your self-hosted ZeroTier controller</div>
            </div>
            <FormControl label={auth_token}>
              <div>
                <input type="password" value={token()} class="input input-bordered w-full" onChange={e => setToken(e.target.value.trim())} />
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