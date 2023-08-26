import { createMemo, createSignal } from 'solid-js';
import Fieldset from '../../components/Fieldset';
import FormControl from '../../components/FormControl';
import TextInput from '../../components/TextInput';
import { useClient } from '../../Client';

export default () => {
  const { addMember } = useClient();
  const [nodeId, setNodeId] = createSignal('');
  const nodeIdValidate = createMemo(() => {
    const id = nodeId();
    return id.length === 10 && [...id].every(c => '0123456789abcdef'.includes(c));
  });

  return <Fieldset legend="Manually Add Member">
    <FormControl label="Node Id">
      <TextInput  class="w-full max-w-xs input-sm" placeholder="8badf00d13"  value={nodeId} onInput={e => setNodeId(e.target.value)}/>
    </FormControl>
    <FormControl class="mt-6">
      <div >
        <span classList={{ 'cursor-not-allowed': !nodeIdValidate() }}>

          <button class="btn btn-primary" type="button" onClick={() => addMember(nodeId())} disabled={!nodeIdValidate()}>Submit</button>
        </span>
      </div>

      <div class="text-xs max-w-lg mt-2">Adds a node to this network before it joins. Can be used to undelete a member.</div>
    </FormControl>

  </Fieldset>;
};
