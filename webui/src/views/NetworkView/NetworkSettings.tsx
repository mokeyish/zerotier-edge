
import { useClient } from '../../Client';
import Accordion from '../../components/Accordion';
import DNS from './DNS';
import FormControl from '../../components/FormControl';
import Multicast from '../../components/Multicast';
import TextArea from '../../components/TextArea';
import TextInput from '../../components/TextInput';
import IPv4AutoAssign from './IPv4AutoAssign';
import IPv6AutoAssign from './IPv6AutoAssign';
import ManageRoutes from './ManageRoutes';
import ManuallyAddMember from './ManuallyAddMember';

export default () => {
  const { currentNetwork: network, updateNetwork: update } = useClient();

  const setName = async (name: string) => update({ config: { name } });

  const setDescription = async (description: string) => {
    await update({ description });
  };

  const settingsHelpCollapsed = () => network()?.ui?.settingsHelpCollapsed ?? true;
  const setSettingsHelpCollapsed = (collapsed: boolean)=> update({ ui: { settingsHelpCollapsed: collapsed } });

  const isPrivate = () => network().config.private ?? true;
  const setPrivate = (isPrivate: boolean) => update({ config: { private: isPrivate } });

  return <div>

    <div class="flex flex-wrap">
      <div class="w-64">
        <h3 class="font-light">Basics</h3>
      </div>
      <div>
        <div>
          <div class="mb-3">
            <FormControl label="Network ID">
              <h5 class="">{network().id}</h5>
            </FormControl>
          </div>

          <div class="mb-4">

            <FormControl label="Name" class="mb-3">
              <TextInput
                class="w-full max-w-xs"
                value={network().config.name}
                onChange={setName}
              />
            </FormControl>

            <FormControl label="Description" class="mb-3">
              <TextArea
                class="w-full max-w-xs"
                value={network().description}
                onChange={setDescription}
              />
            </FormControl>
          </div>
        </div>

        <div>
          <FormControl label="Access Control" class="max-w-lg">
            <div>
              <div className="my-4">
                <div className="flex items-center space-x-2 text-base">
                  <input 
                    type="radio" 
                    id="private"
                    name="radio-10"
                    className="radio radio-primary w-[1em] h-[1em]"
                    checked={isPrivate()}
                    onChange={e => setPrivate(e.target.checked)}
                  />
                  <label htmlFor="private" className="cursor-pointer">
                    Private
                  </label>
                </div>
                <div className="italic indent-6 text-xs max-w-lg">
                  Nodes must be authorized to become members
                </div>
              </div>
              <div className="my-4">
                <div className="flex items-center space-x-2 text-base">
                  <input
                    type="radio"
                    id="public"
                    name="radio-10"
                    className="radio radio-primary w-[1em] h-[1em]"
                    checked={!isPrivate()}
                    onChange={e => setPrivate(!e.target.checked)}
                  />
                  <label htmlFor="public" className="cursor-pointer">
                    Public
                  </label>
                </div>
                <div className="italic indent-6 text-xs max-w-lg">
                  Any node that knows the Network ID can become a member. Members cannot be de-authorized or deleted. Members that haven't been online in 30 days will be removed, but can rejoin.
                </div>
              </div>
            </div>

          </FormControl>
        </div>



      </div>
    </div>

    <div class="divider"></div>

    <div class="flex flex-wrap">
      <div class="w-64">
        <h3 class="font-light">Advanced</h3>
      </div>
      <div class="flex flex-col gap-8">

        <ManageRoutes />

        <IPv4AutoAssign />

        <IPv6AutoAssign />

        <Multicast />

        <DNS />

        <ManuallyAddMember />
      </div>
    </div>

    <div class="mt-12">
      <Accordion header="Settings Help" checked={!settingsHelpCollapsed()} onChange={v => setSettingsHelpCollapsed(!v)}>
        <div class="flex flex-wrap">
          <div class="max-w-md px-3 mr3">
            <section>
              <b>Network ID</b><br />
              The network's globally unique 16-digit ID. This cannot currently be changed.
            </section>
            <section>
              <b>Name</b><br />
              A user-defined short name for this network that is visible to members. We recommend using something like a domain name (e.g. zerotier.com) or e-mail address.
            </section>
            <section>
              <b>Description</b><br />
              A longer description of this network.
            </section>
            <section>
              <b>Access Control</b><br />
              How is membership controlled? This should be left on its default <i>Certificate</i> setting unless you want to create a totally open network for testing, gaming, etc.
            </section>
            <section>
              <b>Multicast Recipient Limit</b><br />
              The maximum number of recipients that can receive an Ethernet multicast or broadcast. If the number of recipients exceeds this limit, a random subset will receive the announcement. Setting this higher makes multicasts more reliable on large networks at the expense of bandwidth.<br /><br class="f7" />Setting to <b>0</b> disables multicast, but be aware that only IPv6 with NDP emulation (RFC4193 or 6PLANE addressing modes) or other unicast-only protocols will work without multicast.
            </section>
          </div>
          <div class="max-w-md px-3 mr3">
            <section>
              <b>Managed Routes</b><br />
              IPv4 and IPv6 routes to be published to network members. This can be used to create routes to other networks via gateways on a ZeroTier network. Note that for security reasons most clients will not use default routes or routes that overlap with public IP address space unless this is specifically allowed by the user. Public IP ranges are marked with an icon:
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 496 512" class="orange pl2" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <title>Allow Global</title>
                <path d="M248 8C111.03 8 0 119.03 0 256s111.03 248 248 248 248-111.03 248-248S384.97 8 248 8zm160 215.5v6.93c0 5.87-3.32 11.24-8.57 13.86l-15.39 7.7a15.485 15.485 0 0 1-15.53-.97l-18.21-12.14a15.52 15.52 0 0 0-13.5-1.81l-2.65.88c-9.7 3.23-13.66 14.79-7.99 23.3l13.24 19.86c2.87 4.31 7.71 6.9 12.89 6.9h8.21c8.56 0 15.5 6.94 15.5 15.5v11.34c0 3.35-1.09 6.62-3.1 9.3l-18.74 24.98c-1.42 1.9-2.39 4.1-2.83 6.43l-4.3 22.83c-.62 3.29-2.29 6.29-4.76 8.56a159.608 159.608 0 0 0-25 29.16l-13.03 19.55a27.756 27.756 0 0 1-23.09 12.36c-10.51 0-20.12-5.94-24.82-15.34a78.902 78.902 0 0 1-8.33-35.29V367.5c0-8.56-6.94-15.5-15.5-15.5h-25.88c-14.49 0-28.38-5.76-38.63-16a54.659 54.659 0 0 1-16-38.63v-14.06c0-17.19 8.1-33.38 21.85-43.7l27.58-20.69a54.663 54.663 0 0 1 32.78-10.93h.89c8.48 0 16.85 1.97 24.43 5.77l14.72 7.36c3.68 1.84 7.93 2.14 11.83.84l47.31-15.77c6.33-2.11 10.6-8.03 10.6-14.7 0-8.56-6.94-15.5-15.5-15.5h-10.09c-4.11 0-8.05-1.63-10.96-4.54l-6.92-6.92a15.493 15.493 0 0 0-10.96-4.54H199.5c-8.56 0-15.5-6.94-15.5-15.5v-4.4c0-7.11 4.84-13.31 11.74-15.04l14.45-3.61c3.74-.94 7-3.23 9.14-6.44l8.08-12.11c2.87-4.31 7.71-6.9 12.89-6.9h24.21c8.56 0 15.5-6.94 15.5-15.5v-21.7C359.23 71.63 422.86 131.02 441.93 208H423.5c-8.56 0-15.5 6.94-15.5 15.5z"></path>
              </svg>.
            </section>
            <section>
              <b>IPv4 Auto-Assign</b><br />
              IPv4 range from which to auto-assign IPs. Note that IPs will only be assigned if they also fall within a defined route. Easy mode allows users to pick an IP range and a route and pool definition will automatically be created.<br />
            </section>
            <section>
              <b>IPv6 Auto-Assign</b><br />
              IPv6 addresses can be automatically assigned with the RFC4193 or 6PLANE addressing schemes, or from a user-defined IPv6 range.<br /><br class="f7" />
              RFC4193 assigns each device a single IPv6 /128 address computed from the network ID and device address, and uses NDP emulation to make these addresses instantly resolvable without multicast.<br /><br class="f7" />
              6PLANE assigns each device a single IPv6 address within a fully routable /80 block and uses NDP emulation to “magically” route the entire /80 to its owner, allowing each device to assign up to 2^48 IPs without additional configuration. This is designed for use with Docker or on VM hosts.<br /><br class="f7" />
              Range assigns each device an IP from a user-defined IPv6 range. An example might look like: “2001:abcd:ef00::” to “2001:abcd:ef00:ffff:ffff:ffff:ffff:ffff” <br />
            </section>
          </div>
          <div class="max-w-md px-3 mr3">
            <section id="#dns-help">
              <b>DNS Push</b>
              <section>
                <p><b>Requires ZeroTier version 1.6</b></p>
                <p>Older versions of ZeroTier will ignore these settings</p>
                <p>On macOS, iOS, Windows, and Android, ZeroTier can automatically add DNS servers for a specific domain. It does not set up or host a DNS server. You must host your own.</p>
                <p>If you configure <span class="i">zt.example.com</span> as your search domain, and <span class="i">10.147.20.1</span> as a server address, then your computer will ask <span class="i">10.147.20.1</span> to look up IP addresses for hostnames ending in <span class="i">zt.example.com</span></p>
                <p>This must be enabled on each client with the allowDNS option. There is a checkbox in the UI in each network's details, near the Allow Managed checkbox.</p>
              </section>
            </section>
          </div>
        </div>

      </Accordion>
    </div>

  </div>;
};
