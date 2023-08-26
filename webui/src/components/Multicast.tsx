import { useClient } from '../Client';
import CheckBox from './CheckBox';
import Fieldset from './Fieldset';
import FormControl from './FormControl';
import NumberInput from './NumberInput';

export default () => {
  const { currentNetwork: network, updateNetwork: update } = useClient();

  const enableBroadcast = () => network().config?.enableBroadcast ?? true;
  const setEnableBroadcast = (enableBroadcast: boolean) => update({
    config: {
      enableBroadcast
    }
  });

  const multicastLimit = () => network().config?.multicastLimit ?? 32;
  const setMulticastLimit = (multicastLimit: number) => update({
    config: {
      multicastLimit
    }
  });

  return <Fieldset legend="Multicast">
    <div class="flex justify-between">
      <div>
        <FormControl label="Multicast Recipient Limit">
          <NumberInput min={0} step={8} value={multicastLimit()} onChange={setMulticastLimit}/>
        </FormControl>
      </div>
      <div>
        <FormControl label="Broadcast">
          <FormControl label={<div>
            <CheckBox class="checkbox-primary align-bottom" checked={enableBroadcast} onChange={setEnableBroadcast} />
            <span class="p-2">Enable Broadcast</span>
          </div>}>
          </FormControl>
        </FormControl>
      </div>
    </div>
  </Fieldset>;
};