import { For, Show, createMemo, createSignal } from 'solid-js';
import { useClient } from '../../Client';
import Fieldset from '../../components/Fieldset';
import FormControl from '../../components/FormControl';
import TextInput from '../../components/TextInput';
import Icon from '../../components/Icon';
import { ipv4Regex, ipv6Regex } from './ManageRoutes';

export default () => {
  const { currentNetwork: network, updateNetwork: update } = useClient();
  const servers = () => network().config?.dns?.servers ?? [];
  const [server, setServer] = createSignal('');

  const searchDomain = () => network().config?.dns.domain ?? '';
  const setSearchDomain = (domain: string) => update({
    config: {
      dns: {
        domain: domain
      }
    }
  });

  const clearDNSConfig = () => update({
    config: {
      dns: {
        domain: '',
        servers: []
      }
    }
  });

  const addDNSServer = async () => {
    await update({
      config: {
        dns: {
          servers: [
            ...new Set([
              ...servers(),
              server()
            ])
          ]
        }
      }
    });
  };

  const deleteDNSServer = (server: string) => update({
    config: {
      dns: {
        servers: servers().filter(s => s !== server)
      }
    }
  });

  const serverValidate = createMemo(() => ipv4Regex.test(server()) || ipv6Regex.test(server())) ;

  return <Fieldset legend="DNS">

    <div>Requires ZeroTier version 1.6. See Settings Help below.</div>

    <FormControl label="Search Domain">
      <TextInput value={searchDomain} placeholder="home.arpa" onChange={v => setSearchDomain(v.trim())} />
    </FormControl>

    <FormControl label="Server Address">
      <TextInput value={server} placeholder="10.147.20.190" onInput={e => setServer(e.target.value)}/>
    </FormControl>

    <FormControl class="mt-6">
      <div>
        <span classList={{ 'cursor-not-allowed': !serverValidate() }}>
          <button class="btn" disabled={!serverValidate()} onClick={addDNSServer}>Submit</button></span>
      </div>
    </FormControl>

    <Show when={servers().length > 0}>
      <div class="flex justify-between">
        <div class="pt-3">
          <div>
            <table>
              <caption class="uppercase">Servers</caption>
              <tbody>
                <For each={servers()}>
                  {server => <tr>
                    <td>{server}</td>
                    <td>
                      <button onClick={() => deleteDNSServer(server)}><Icon.TrashCan /></button>
                    </td>
                  </tr>}
                </For>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <button class="btn btn-error" onClick={clearDNSConfig}>Clear DNS config</button>
        </div>
      </div>
    </Show>


  </Fieldset>;
};