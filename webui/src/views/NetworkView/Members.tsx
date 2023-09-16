import type { Member } from '../../zerotier';
import { ipv4Subnets, useClient } from '../../Client';
import { For, Match, Show, Switch, createMemo, createSignal } from 'solid-js';
import { ipv4Regex, ipv6Regex } from './ManageRoutes';
import CheckBox from '../../components/CheckBox';
import TextInput from '../../components/TextInput';
import Accordion from '../../components/Accordion';
import FormControl from '../../components/FormControl';
import Icon from '../../components/Icon';
import dayjs from 'dayjs';
import ipv6Generator from '../../utils/ipv6-generator';

export default () => {
  const { currentNetwork: network, members, updateNetwork: update, updateMember, deleteMember, status } = useClient();

  const [authorized, setAuthorized] = createSignal(true);
  const [notAuthorized, setNotAuthorized] = createSignal(true);
  const [bridges, setBridges] = createSignal(false);
  const [inactive, setInactive] = createSignal(false);
  const [active, setActive] = createSignal(false);
  const [hidden, setHidden] = createSignal(false);
  const [sortBy, setSortBy] = createSignal<'Address' | 'Name'>('Address');
  const [searchWords, setSearchWords] = createSignal('');

  const membersHelpCollapsed = () => network()?.ui?.membersHelpCollapsed ?? true;
  const setMembersHelpCollapsed = (collapsed: boolean) => update({ ui: { membersHelpCollapsed: collapsed } });

  const filteredMembers = createMemo(() => {
    let ms = members();

    // apply filters
    if (ms.length > 0) {
      ms = members().filter(m => {
        return (m.config.authorized ? authorized() : notAuthorized())
          && (active() || inactive() ? (m.active ? active() : inactive()) : true)
          && (bridges() ? m.config.activeBridge : true)
          && (hidden() ? m.hidden : !m.hidden);
      });
    }

    // apply search
    if (ms.length > 0) {
      let sw = searchWords();
      if (sw.length > 0) {
        const s1 = ms.filter(m => m.name?.includes(sw) || m.nodeId?.includes(sw));
        if (s1.length > 0) {
          ms = s1;
        } else {
          sw = sw.toLowerCase();
          ms = ms.filter(m => m.name?.toLowerCase()?.includes(sw) || m.nodeId?.toLowerCase()?.includes(sw));
        }
        return ms;
      }
    }

    return ms.length > 0 ? ms.sort((a, b) => {
      switch (sortBy()) {
      case 'Address':
        return a.nodeId.localeCompare(b.nodeId);
      case 'Name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
      }
    }) : ms;
  });

  const currentIpv4SubnetInfo = createMemo(() => {
    const ipPools = network().config.ipAssignmentPools;
    if (ipPools.length !== 1) {
      return undefined;
    }
    const range = ipPools[0];
    return ipv4Subnets.find((v) => v.range.ipRangeStart === range.ipRangeStart && v.range.ipRangeEnd === range.ipRangeEnd);
  });

  const ipv4Placeholder = createMemo(() => currentIpv4SubnetInfo()?.name.replaceAll('*', 'x') ?? '192.168.x.x');


  const MemberRow = (props: { member: Member }) => {

    const member: () => Member = () => {
      const member = props.member;
      const s = status();
      const isCurrentNode = status()?.address === member.nodeId;

      if (isCurrentNode) {
        let physicalAddress = s.config?.settings?.surfaceAddresses[0];
        if (physicalAddress) {
          physicalAddress = physicalAddress.split('/')[0];
        }
        return {
          ...member,
          lastSeen: Date.now(),
          clientVersion: s.version,
          physicalAddress: physicalAddress
        };
      }

      return member;
    };
    const [showAdanceSetting, setShowAdanceSetting] = createSignal(false);

    const setName = (name: string) => updateMember(member(), { name });
    const setDescription = (description: string) => updateMember(member(), { description });
    const authorizeMember = (authorized: boolean) => updateMember(member(), { config: { authorized } });
    const hideMember = () => updateMember(member(), { hidden: true });
    const unHideMember = () => updateMember(member(), { hidden: false });
    const setMemberBridge = (activeBridge: boolean) => updateMember(member(), { config: { activeBridge } });
    const setMemberNoAutoAssignIps = (noAutoAssignIps: boolean) => updateMember(member(), { config: { noAutoAssignIps } });

    const ipAssignments = () => member().config.ipAssignments ?? [];
    const activeBridge = () => member().config.activeBridge;
    const noAutoAssignIps = () => member().config.noAutoAssignIps;
    const deleteIp = (ip: string) => updateMember(member(), {
      config: {
        ipAssignments: ipAssignments().filter(x => x !== ip)
      }
    });

    const addIp = (ip: string) => updateMember(member(), {
      config: {
        ipAssignments: [
          ...new Set([
            ...ipAssignments(),
            ip
          ]
          )
        ]
      }
    });

    const [ipToAdd, setIpToAdd] = createSignal('');
    const ipToAddValidate = createMemo(() => {
      const ip = ipToAdd();
      return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    });


    const ipv6AddrRfc4193 = createMemo(() => {
      if (network().config.v6AssignMode?.rfc4193) {
        const m = member();
        return ipv6Generator.generateRfc4193(m.networkId, m.nodeId);
      }
    });

    const ipv6Addr6plane = createMemo(() => {
      if (network().config.v6AssignMode?.['6plane']) {
        const m = member();
        return ipv6Generator.generate6plane(m.networkId, m.nodeId);
      }
    });


    return <>
      <tr>
        <td>
          <CheckBox checked={member().config.authorized} onChange={authorizeMember} />
        </td>
        <td classList={{ 'bg-base-300': showAdanceSetting() }}>
          <button onClick={() => setShowAdanceSetting(prev => !prev)}><Icon.Wrench></Icon.Wrench></button>
        </td>
        <td>{member().config.id}</td>
        <td >
          <div class="flex flex-col gap-2">
            <TextInput placeholder="(short-name)" value={member().name} onChange={setName} class="input-sm" />
            <TextInput placeholder="(desciption)" value={member().description} onChange={setDescription} class="input-sm" />
          </div>
        </td>
        <td >
          <div class="flex flex-col gap-2">
            <Show when={ipv6AddrRfc4193()}><div>{ipv6AddrRfc4193()}</div></Show>
            <Show when={ipv6Addr6plane()}><div>{ipv6Addr6plane()}</div></Show>
            <For each={ipAssignments()}>
              {ip => <div>
                <button type="button" class="text-primary" onClick={() => deleteIp(ip)}><Icon.TrashCan /></button>
                <span class="ml-2">{ip}</span>
              </div>}
            </For>
            <div class="flex flex-nowrap">
              <button type="button" classList={ { 'cursor-not-allowed': !ipToAddValidate() } } onClick={() => addIp(ipToAdd())}><Icon.Plus /></button>
              <TextInput class="input-sm ml-2" placeholder={ipv4Placeholder()} value={ipToAdd} onInput={e => setIpToAdd(e.target.value.trim())} />
            </div>
          </div>
        </td>
        <td><span class="uppercase" classList={{ 'text-error': !(member().lastSeen > 0) }}>{member().lastSeen > 0 ? dayjs(new Date(member().lastSeen ?? 0)).fromNow() : 'Unkown'}</span></td>
        <td>
          <span classList={{ 'text-error': member().clientVersion === '0.0.0' }}>{member().clientVersion}</span>
        </td>
        <td>
          <Show when={member().physicalAddress} fallback={<span class="text-error uppercase">Unknown</span>}>
            <span>{member().physicalAddress}</span>
          </Show>
        </td>
        <td class="p-1">
          <button onClick={() => deleteMember(member())}><Icon.TrashCan class="text-primary" /></button>
        </td>
        <td class="p-1">
          <Show when={member().hidden} fallback={<button onClick={hideMember}><Icon.Hide class="text-primary" /></button>}>
            <button onClick={unHideMember}><Icon.UnHide class="text-primary" /></button>
          </Show>
        </td>
      </tr>
      <Show when={showAdanceSetting()}>
        <tr class="relative -top-1">
          <td></td>
          <td colspan="6" class="bg-base-300">
            <div>
              <FormControl label={<div>
                <CheckBox class="align-bottom" checked={activeBridge} onChange={setMemberBridge} />
                <span class="p-2">Allow Ethernet Bridging</span>
              </div>}>

                <div class="pl-8 text-xs max-w-lg">Bridging requires additional setup on the device. See manual and knowledgebase for more information. Mobile devices cannot be bridges.</div>
              </FormControl>


              <FormControl label={<div>
                <CheckBox class="align-bottom" checked={noAutoAssignIps} onChange={setMemberNoAutoAssignIps} />
                <span class="p-2">Do Not Auto-Assign IPs</span>
              </div>}>
              </FormControl>

            </div>
          </td>
        </tr>
      </Show>
    </>;
  };


  return <div>

    <Switch>
      <Match when={members().length === 0} >
        <div class="p-4 bg-warning">
          <div class="max-w-3xl m-auto">
            <h2>No devices have joined this network</h2>
            <p>Use the ZerotierOne app on your devices to <b>join</b> <span class="text-lg">{network().id}</span>.</p>
            <p>Visit <a href="https://www.zerotier.com/download.shtml">the downloads page</a> to get the app.</p>
          </div>
        </div>
      </Match>

      <Match when={members().length === 1} >
        <div class="p-4 bg-warning">
          <div class="max-w-3xl m-auto">
            <h2>One device has joined this network</h2>
            <p>A ZeroTier network should have at least 2 member devices.</p>
            <p>Use the ZeroTierOne app on your devices to <b>join</b> <span class="text-lg">{network().id}</span>.</p>
            <p>Visit <a href="https://www.zerotier.com/download.shtml">the downloads page</a> to get the app.</p>
          </div>
        </div>
      </Match>

    </Switch>

    <Show when={members().length > 0}>
      <div>
        <div class="pt-4">
          <div class="flex flex-wrap">

            <div class="mr-20 flex flex-col">
              <label>Search (Address / Name)</label>
              <TextInput class="input-sm input-primary" value={searchWords} onInput={e => setSearchWords(e.currentTarget.value.trim())} />
            </div>


            <div class="mr-20">
              <label>Display Filter</label>
              <div class="flex">
                <div class="mr-3">
                  <div class="cursor-pointer" onClick={() => setAuthorized(v => !v)}><CheckBox class="checkbox-sm" checked={authorized} /><span class="ml-2">Authorized</span></div>
                  <div class="cursor-pointer" onClick={() => setNotAuthorized(v => !v)}><CheckBox class="checkbox-sm" checked={notAuthorized} /><span class="ml-2">Not Authorized</span></div>
                  <div class="cursor-pointer" onClick={() => setBridges(v => !v)}><CheckBox class="checkbox-sm" checked={bridges} /><span class="ml-2">Bridges</span></div>
                </div>
                <div>
                  <div class="cursor-pointer flex justify-between gap-4" onClick={() => setInactive(v => !v)}>
                    <span>
                      <CheckBox class="checkbox-sm" checked={inactive} />
                      <span class="ml-2">Inactive</span>
                    </span>
                    <span class="badge badge-primary font-mono">{members().filter(m => !m.active).length}</span>
                  </div>
                  <div class="cursor-pointer flex justify-between gap-4" onClick={() => setActive(v => !v)}>
                    <span>
                      <CheckBox class="checkbox-sm" checked={active} />
                      <span class="ml-2">Active</span>
                    </span>
                    <span class="badge badge-primary font-mono">{members().filter(m => m.active).length}</span>
                  </div>
                  <div class="cursor-pointer flex justify-between gap-4" onClick={() => setHidden(v => !v)}>
                    <span>
                      <CheckBox class="checkbox-sm" checked={hidden} />
                      <span class="ml-2">Hidden</span>
                    </span>
                    <span class="badge badge-primary font-mono">{members().filter(m => m.hidden === true).length}</span>
                  </div>
                </div>
              </div>
            </div>


            <div>
              <label>Sort By</label>
              <div>
                <div class="cursor-pointer" onClick={() => setSortBy('Address')}>
                  <input type="radio" name="sortBy" class="radio radio-sm" checked={sortBy() === 'Address'} />
                  <span class="ml-2">Address</span>
                </div>
                <div class="cursor-pointer" onClick={() => setSortBy('Name')}>
                  <input type="radio" name="sortBy" class="radio radio-sm" checked={sortBy() === 'Name'} />
                  <span class="ml-2">Name</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div>
          <Icon.AngleLeft />
          <span><b>1-4</b>/<b>4</b></span>
          <Icon.AngleRight />
        </div>
        <div class="not-prose overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Auth?</th>
                <th></th>
                <th>Address</th>
                <th>Name/Description</th>
                <th>Managed IPs</th>
                <th>Last Seen</th>
                <th>Version</th>
                <th>Physical IP</th>
                <th class="p-1"></th>
                <th class="p-1"></th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredMembers()}>
                {member => <MemberRow member={member} />}
              </For>
            </tbody>
          </table>
        </div>
      </div>

    </Show>

    <div class="mt-12">

      <Accordion header="Members Help" checked={!membersHelpCollapsed()} onChange={v => setMembersHelpCollapsed(!v)}>
        <section class="px-3">
          <h3>Members</h3>
          <p>When a node joins a ZeroTier network, we call it a member.</p>
        </section>
        <div class="flex flex-wrap">
          <section class="px-3 max-w-md">
            <h3>Auth?</h3>
            <p>When a member is authorized, it's allowed to talk to other members of the network.</p>
            <p>If you don't have an Auth column, your network is set to public access. See the Settings section of this network.</p>
          </section>
          <section class="px-3 max-w-md">
            <h3>Address</h3>
            <p>A ZeroTier Node's Address. This is the node's unique ZeroTier ID.</p>
          </section>
          <section class="px-3 max-w-md">
            <h3>Name and Description</h3>
            <p>You can put whatever you like here. It is hard to remember node IDs, so names help you remember which device is which. </p>
            <p>If you use a DNS tool with your network, like <a href="https://github.com/zerotier/zeronsd">zeronsd</a>, you may want to use valid hostnames for your member names. Something like "bob-laptop" or "sql-server-01"</p>
          </section>
          <section class="px-3 max-w-md">
            <h3>Managed IPs</h3>
            <p>These are the IP addresses you use when you use ZeroTier. Typically Easy Auto-Assign is enabled and you do not need to change anything. You can set Managed IPs manually if you like. </p>
          </section>
          <section class="px-3 max-w-md">
            <h3>Last Seen</h3>
            <p>The last time this member checked in with the network controller for this network.</p>
          </section>
          <section class="px-3 max-w-md">
            <h3>Physical IP</h3>
            <p>The physical IP address the member is connecting to the controller. It is Probably the IP address of your internet router/modem.</p>
          </section>
          <section class="px-3 max-w-md">
            <h3>Delete <span><Icon.TrashCan /></span></h3><p>If you never want to see a node in this member list again, you can delete it. </p><p>If you deleted a member and decide you want it back, you can use the "manually add member" form.</p></section>
          <section class="px-3 max-w-md">
            <h3>Hide <span><Icon.Hide /></span></h3>
            <p>This deauthorizes and hides the member from the list. You can select the "hidden" checkbox to show hidden members.</p>
          </section>

        </div>
      </Accordion>
    </div>


  </div>;
};


