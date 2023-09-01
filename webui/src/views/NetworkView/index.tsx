import { useNavigate, useParams } from '@solidjs/router';
import { Show, Suspense, createSignal, onCleanup, onMount } from 'solid-js';
import NetworkSettings from './NetworkSettings';
import Members from './Members';
import Accordion from '../../components/Accordion';
import Icon from '../../components/Icon';
import FlowRules from './FlowRules';
import { useClient } from '../../Client';


export default () => {

  const { currentNetwork: network, setCurrentNetwork, deleteNetwork, ui, setUI } = useClient();

  const navigate = useNavigate();

  const params = useParams();
  const networkId = params.networkId;
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    await setCurrentNetwork(networkId);
    setLoading(false);
  });
  onCleanup(() => setCurrentNetwork(undefined));


  return <>
    <Suspense fallback={<div>Loading...</div>}>

      <div class="mx-12">

        <a onClick={() => navigate('/')} class="opacity-70 cursor-pointer">
          <Icon.ArrowLeft /><span class="ml-2">Networks</span>
        </a>

        <Show when={network()} fallback={<Show when={!loading()}>
          <div>
            <div class="hero mt-28">
              <div class="hero-content text-center">
                <div class="text-5xl font-black">Network not found!!!</div>
              </div>
            </div>
          </div>
        </Show>}>
          <h1 title="Network Name" class="my-3 text-3xl italic">{network().config.name ?? ''}</h1>

          <div class="my-6">
            <h2 title="Network ID" class="text-sm mt-4">{network().id}</h2>
            <div title="Network Description" class="max-w-lg">{network().description}</div>
          </div>
          <div class="my-2 flex flex-col gap-4">

            <Accordion header="Settings" checked={!ui.settingsCollapsed} onChange={v => setUI('settingsCollapsed', !v)}>
              <NetworkSettings />
            </Accordion>

            <Accordion header="Members" checked={!ui.membersCollapsed} onChange={v => setUI('membersCollapsed', !v)}>
              <Members />
            </Accordion>

            <Accordion header="Flow Rules" checked={!ui.flowRulesCollapsed} onChange={v => setUI('flowRulesCollapsed', !v)}>
              <FlowRules />
            </Accordion>
          </div>

          <div class="my-16">
            <button class="btn btn-error" onclick={deleteNetwork}>Delete Network</button>
          </div>
        </Show>

      </div>
    </Suspense>
  </>;
};