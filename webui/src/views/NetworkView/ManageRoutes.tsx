import { For, Show, createMemo, createSignal } from 'solid-js';
import Fieldset from '../../components/Fieldset';
import FormControl from '../../components/FormControl';
import TextInput from '../../components/TextInput';
import Icon from '../../components/Icon';
import { useClient } from '../../Client';

export const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
export const ipv6Regex = /^((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*::((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*|((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4})){7}$/;
export const ipv4cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
export const ipv6cidrRegex = /^((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*::((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*|((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4})){7}\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/;


export default () => {
  const { currentNetwork: network, updateNetwork: update } = useClient();
  const routes = () => network().config.routes ?? [];

  const [destination, setDestination] = createSignal<string>('');
  const [via, setVia] = createSignal<string>('');


  const routeValidate = createMemo(() =>
    ipv4cidrRegex.test(destination()) && (via().length === 0 || ipv4Regex.test(via()))
    || ipv6cidrRegex.test(destination()) && (via().length === 0 || ipv6Regex.test(via()))
  );

  const addRoute = () => update({
    config: {
      routes: [
        ...routes(),
        { target: destination(), via: via() }
      ]
    }
  });

  const deleteRoute = (idx: number) => update({
    config: {
      routes: routes().filter((_, i) => i != idx)
    }
  });

  return <Fieldset legend="Managed Routes">
    <div class="not-prose">
      <table class="m-0 font-mono">
        <tbody>
          <Show when={routes().length > 0} fallback={<div>
            <div class="bg-warning p-3">
              <h3 class="my-0">No managed routes defined.</h3>
              <p>Devices will not get an IP address without a matching route.</p>
              <small>If you do not have specific requirements, try the IPv4 Auto-Assign Easy mode below.</small>
            </div>
          </div>}>
            <For each={routes()}>{
              (route, idx) => <tr class="border-none">
                <td class="pr-2"><button class="text-primary" onclick={() => deleteRoute(idx())}><Icon.TrashCan/></button></td>
                <td>
                  <span class="max-w-lg overflow-scroll">
                    {route.target}
                  </span>
                </td>
                <td class="p-2 opacity-75 text-xs">{route.via ? 'via' : ''}</td>
                <td>{route.via ?? '(LAN)'}</td>
              </tr>}
            </For>
          </Show>

        </tbody>
      </table>
    </div>

    <div class="divider"></div>

    <FormControl label="Add Routes">

      <div class="flex flex-wrap my-2 gap-6">
        <FormControl label="Desitination">
          <TextInput class="w-full max-w-xs" placeholder="10.11.12.0/24" value={destination() ?? ''} onChange={v => setDestination(v.trim())} />
        </FormControl>
        <FormControl label="Via">
          <TextInput class="w-full max-w-xs" placeholder="192.168.168.1" value={via() ?? ''} onChange={v => setVia(v.trim())} />
        </FormControl>
      </div>
    </FormControl>

    <FormControl class="mt-6">
      <div>
        <span classList={{ 'cursor-not-allowed': !routeValidate() }}>
          <button class="btn btn-primary" type="button" onClick={addRoute} disabled={!routeValidate()}>Submit</button>
        </span>
      </div>
    </FormControl>




  </Fieldset>;
};