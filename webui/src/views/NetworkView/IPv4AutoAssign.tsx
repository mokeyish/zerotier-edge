import { For, Match, Show, Switch, createMemo, createSignal } from 'solid-js';
import CheckBox from '../../components/CheckBox';
import Fieldset from '../../components/Fieldset';
import FormControl from '../../components/FormControl';
import TextInput from '../../components/TextInput';
import { ipv4Regex } from './ManageRoutes';
import { Ipv4SubnetInfo, ipv4Subnets, useClient } from '../../Client';
import Icon from '../../components/Icon';


export default () => {
  const { currentNetwork: network, updateNetwork: update } = useClient();
  const ipAssignmentPools = () => network().config?.ipAssignmentPools ?? [];
  const ipv4AssignmentPools = () => ipAssignmentPools().filter(x => x.ipRangeStart?.includes('.'));
  
  const v4AssignMode = () => network().config.v4AssignMode.zt;

  const v4EasyMode = () => network()?.ui?.v4EasyMode ?? true;
  const setV4EasyMode = (enabled: boolean) => update({ ui: { v4EasyMode: enabled } });
  
  const [rangeStart, setRangeStart] = createSignal<string>('');
  const [rangeEnd, setRangeEnd] = createSignal<string>('');

  const setV4AssignMode = (checked: boolean) => update({
    config: {
      v4AssignMode: {
        zt: checked
      }
    }
  });

  const setSubnet = (rangeInfo: Ipv4SubnetInfo) => update({
    config: {
      routes: [
        { target: rangeInfo.target },
        ...(network()?.config?.routes ?? []).filter(x => x.via)
      ],
      ipAssignmentPools: [
        rangeInfo.range
      ]
    }
  });


  const ipv4RangeActiveIndex = createMemo(() => {
    const ipPools = ipv4AssignmentPools();
    if (ipPools.length !== 1) {
      return -1;
    }
    const range = ipPools[0];
    return ipv4Subnets.findIndex((v) => v.range.ipRangeStart === range.ipRangeStart && v.range.ipRangeEnd === range.ipRangeEnd);
  });

  const ipv4AssignmentRangeValidate = createMemo(() => ipv4Regex.test(rangeStart()) && ipv4Regex.test(rangeEnd()));

  const addIpv4AssignmentRange = () => update({
    config: {
      ipAssignmentPools: [
        ...ipAssignmentPools(),
        { ipRangeStart: rangeStart(), ipRangeEnd: rangeEnd() }
      ]
    }
  });
  
  const deleteIpAssignmentRange = ({ ipRangeStart, ipRangeEnd }: { ipRangeStart?: string, ipRangeEnd?: string }) => update({
    config: {
      ipAssignmentPools: [
        ...ipAssignmentPools().filter(x => !(x.ipRangeStart === ipRangeStart && x.ipRangeEnd === ipRangeEnd))
      ]
    }
  });

  return <Fieldset legend="IPv4 Auto-Assign">
    <div>
      <FormControl label={<div>
        <CheckBox class="checkbox-primary align-bottom" checked={v4AssignMode} onChange={setV4AssignMode} />
        <span class="ml-2">Auto-Assign from Range</span>
      </div>}>
      </FormControl>

      <Show when={v4AssignMode()}>
        <div class="max-w-lg mt-4">
          <ul class="list-none p-0 m-0 flex border-slate-200 border-2">
            <li class="flex-1 m-0 p-0">
              <button
                class="w-full"
                classList={{ 'bg-primary': v4EasyMode(), 'text-primary-content': v4EasyMode() }}
                onClick={() => setV4EasyMode(true)}>
                Easy
              </button>
            </li>
            <li class="flex-1 m-0 p-0">
              <button
                class="w-full"
                classList={{ 'bg-primary': !v4EasyMode(), 'text-primary-content': !v4EasyMode() }}
                onClick={() => setV4EasyMode(false)}>
                Advanced
              </button>
            </li>
          </ul>

          <div class="divider my-0"></div>
          <Switch>
            <Match when={v4EasyMode()}>
              <ul class="list-none p-0 m-0 flex flex-wrap">
                <For each={ipv4Subnets}>
                  {(ipRange, idx) => <li
                    class="p-0 m-0 w-1/4 flex-grow flex justify-center hover:bg-secondary-focus cursor-pointer rounded my-1"
                    classList={{ 'bg-primary': idx() === ipv4RangeActiveIndex() }}
                  >
                    <a class="hover:text-secondary-content" classList={{ 'text-primary-content': idx() === ipv4RangeActiveIndex() }} onClick={() => setSubnet(ipRange)}><span>{ipRange.name}</span></a>
                  </li>}
                </For>
              </ul>
            </Match>
            <Match when={!v4EasyMode()}>
              <FormControl label="Auto-Assign Pools">
                <table class="m-0">
                  <tbody>
                    <tr>
                      <td></td>
                      <td>Start</td>
                      <td>End</td>
                    </tr>
                    <For each={ipv4AssignmentPools()}>
                      {(range) => <tr>
                        <td><button class="text-primary" onClick={() => deleteIpAssignmentRange(range)}><Icon.TrashCan /></button></td>
                        <td>{range.ipRangeStart}</td>
                        <td>{range.ipRangeEnd}</td>
                      </tr>}
                    </For>
                  </tbody>
                </table>
              </FormControl>

              <FormControl label="Add IPv4 Address Pools">
                <div class="flex flex-wrap my-2 gap-2">
                  <FormControl label="Start">
                    <TextInput class="w-full max-w-xs" placeholder="192.168.168.1" value={rangeStart() ?? ''} onChange={setRangeStart} />
                  </FormControl>
                  <FormControl label="End">
                    <TextInput class="w-full max-w-xs" placeholder="192.168.168.254" value={rangeEnd() ?? ''} onChange={setRangeEnd} />
                  </FormControl>
                </div>
              </FormControl>

              <FormControl class="mt-6">
                <div>
                  <span classList={{ 'cursor-not-allowed': !ipv4AssignmentRangeValidate() }}>

                    <button class="btn btn-primary" type="button" onClick={addIpv4AssignmentRange} disabled={!ipv4AssignmentRangeValidate()}>Sumbit</button>
                  </span>
                </div>
              </FormControl>


            </Match>
          </Switch>
        </div>
      </Show>

    </div>
  </Fieldset>;
};