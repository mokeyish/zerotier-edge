
import { useNavigate } from '@solidjs/router';
import { useClient } from '../Client';
import { For, createMemo } from 'solid-js';

export default () => {
  const navigate = useNavigate();
  const { networks, createNewNetwork } = useClient();
  const totalMemberCount = createMemo(() => networks().reduce((p, c) => p + (c.totalMemberCount ?? 0), 0));
  const authorizedMemberCount = createMemo(() => networks().reduce((p, c) => p + (c.authorizedMemberCount ?? 0), 0));

  return (

    <div class="flex flex-col items-center">

      <div class="mb-4">
        <button class="btn btn-primary" onclick={createNewNetwork}>Create A Network</button>
      </div>

      <div class="flex flex-row flex-wrap">
        <div class="w-52">
          <div class="font-bold text-2xl">Your Networks</div>

          <div class="h-2"></div>

          <div>Networks: 
            <span class="font-bold">{networks().length}</span>
          </div>

          <div>Authorized Nodes: 
            <span class="font-bold">{authorizedMemberCount()} / {totalMemberCount()}</span>
          </div>
        </div>

        <div>
          <div class="">
            <table class="table">
              {/* head */}
              <thead>
                <tr>
                  <th>NETWORK ID</th>
                  <th>NAME</th>
                  <th class="hidden sm:table-cell">DESCRIPTION</th>
                  <th class="hidden md:table-cell">SUBNET</th>
                  <th class="hidden lg:table-cell">NODES</th>
                  <th class="hidden xl:table-cell">CREATED</th>
                </tr>
              </thead>
              <tbody>
                <For each={networks()}>
                  {(net) => <tr class="btn-ghost cursor-pointer" onclick={() => navigate(`/network/${net.id}`)}>
                    <th>{net.id}</th>
                    <th>{net.config.name}</th>
                    <th class="hidden sm:table-cell">{net.description ?? ''}</th>
                    <th class="hidden md:table-cell">{net.config.routes.find((route) => !route.via)?.target}</th>
                    <th class="hidden lg:table-cell"><div class="badge badge-primary font-mono">{net.authorizedMemberCount ?? 0}</div></th>
                    <th class="hidden xl:table-cell">{new Date(net.config.creationTime).toISOString().substring(0, 10)}</th>
                  </tr>}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>

  );
};