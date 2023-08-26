
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

      <div class="flex flex-row">
        <div class="mr-8">
          <div class="text-2xl">Your Networks</div>

          <div class="h-2"></div>

          <div>Networks: {networks().length}</div>

          <div>Athorized Nodes: {authorizedMemberCount()}/{totalMemberCount()}</div>
        </div>

        <div>
          <div class="overflow-x-auto">
            <table class="table">
              {/* head */}
              <thead>
                <tr>
                  <th>NETWORK ID</th>
                  <th>NAME</th>
                  <th>DESCIPTION</th>
                  <th>SUBNET</th>
                  <th>NODES</th>
                  <th>CREATED</th>
                </tr>
              </thead>
              <tbody>
                <For each={networks()}>
                  {(net) => <tr class="btn-ghost cursor-pointer" onclick={() => navigate(`/network/${net.id}`)}>
                    <th>{net.id}</th>
                    <th>{net.config.name}</th>
                    <th>{net.description ?? ''}</th>
                    <th>{net.config.routes.find((route) => !route.via)?.target}</th>
                    <th><div class="badge badge-primary font-mono">{net.authorizedMemberCount ?? 0}</div></th>
                    <th>{new Date(net.config.creationTime).toISOString().substring(0, 10)}</th>
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