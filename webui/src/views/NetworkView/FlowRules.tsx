import { minimalSetup, EditorView } from 'codemirror';
import { createMemo, createSignal } from 'solid-js';
import CodeMirror, { EditorViewConfig } from '../../components/CodeMirror';
import TextArea from '../../components/TextArea';
import RuleCompiler from '../../utils/rule-compiler';
import { useClient } from '../../Client';
import { linter, Diagnostic } from '@codemirror/lint';
import Accordion from '../../components/Accordion';


export default () => {
  const { currentNetwork: network, updateNetwork: update } = useClient();
  const [source, setSource] = createSignal(network().rulesSource ?? '');
  const [lintError, setLintError] = createSignal(false);
  const rules = () => network().config.rules ?? [];
  const capabilities = () => network().config.capabilities ?? [];
  const tags = () => network().config.tags ?? [];
  const ruleJson = createMemo(() => JSON.stringify({
    rules: rules(),
    capabilities: capabilities(),
    tags: tags()
  }, null, 2));

  const rulesHelpCollapsed = () => network()?.ui?.rulesHelpCollapsed ?? true;
  const setRulesHelpCollapsed = (collapsed: boolean)=> update({ ui: { rulesHelpCollapsed: collapsed } });

  const saveChanges = async () => {
    const rulesSource = source();
    const rules = [];
    const capsMap: { [k: string]: Record<string, never> } = {};
    const tagsMap: { [k: string]: Record<string, never> } = {};

    const err = RuleCompiler.compile(rulesSource, rules, capsMap, tagsMap);

    if (err) {
      console.error(err);
    } else {
      const tags = Object.values(tagsMap);
      const capabilities = Object.values(capsMap);
      const capabilitiesByName = Object.fromEntries(Object.entries(capsMap).map(([n, v]) => [n, v.id]));
      const tagsByName = tagsMap;
      await update({
        rulesSource: rulesSource,
        config: {
          rules,
          tags,
          capabilities,
        },
        capabilitiesByName,
        tagsByName
      });
    }
  };


  const flowRuleEditorConfig: EditorViewConfig = {
    doc: source(),
    extensions: [
      minimalSetup,
      EditorView.lineWrapping,
      linter(view => {
        const diagnostics: Diagnostic[] = [];
        const doc = view.state.doc.toString();

        const err = RuleCompiler.compile(doc, [], {}, {});
        if (err) {
          const line = view.state.doc.line(err[0]);
          const from = line.from + err[1]; // + err[1]
          diagnostics.push({
            from,
            to: line.to,
            severity: 'error',
            message: err[2]
          });
          setLintError(true);
        } else {
          setLintError(false);
        }
        return diagnostics;
      }),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const docString = update.state.doc.toString();
          setSource(docString);
        }
      })
    ]
  };


  return <div>

    <div class="flex flex-wrap">
      <CodeMirror config={flowRuleEditorConfig} class="min-w-80 min-h-[20vh] max-h-[80vh] flex-1 bg-base-100 overflow-y-auto p-4" classList={{
        'border-2': lintError(),
        'border-error': lintError()
      }} />

      <div class="ml-2 w-80 min-h-[20vh] max-h-[80vh]"><TextArea class="w-full h-full font-mono text-xs" value={ruleJson} /></div>
    </div>

    <div class="mt-6 flex items-center justify-between">
      <button class="btn btn-secondary" onClick={saveChanges}>Save Changes</button>
      <div class="flex gap-2">
        <span>{rules().length}/1024 rules.</span>
        <span>{capabilities().length} capabilities.</span>
        <span>{tags().length} tags. </span>
      </div>
    </div>

    <div class="mt-12">
      <Accordion header="Flow Rules Help" checked={!rulesHelpCollapsed()} onChange={v => setRulesHelpCollapsed(!v)}>
        <table class="m-0">
          <tbody>
            <tr><td colspan="2">
              <h3>The Basics</h3>
              The ZeroTier rule definition language is designed to be simple for both humans and machines to read. Our editor compiles it into an actual ZeroTier rule set as you type, which is shown in the light yellow box to the right of the editor.<br /><br /><div class="code"><b>#</b> <i>the remainder of this line is a comment</i><br /><br /><b>action</b> [... args ...]<br />&nbsp;&nbsp;&nbsp;&nbsp;[<b>or</b>] [<b>not</b>] [<i>match</i> [...]]<br />&nbsp;&nbsp;&nbsp;&nbsp;[ ... ]<br /><b>;</b><br /><br /><b>macro</b> <i>macro-name</i>[($<i>var-name</i>[,...])]<br />&nbsp;&nbsp;&nbsp;&nbsp;[... matches | actions ...]<br /><b>;</b><br /><br /><b>include</b> <i>macro-name</i>[(...)]<br /></div>
              <br />A few things to remember:
              <br />
              <br />
              <ul>
                <li>An action containing no matches is always taken. For example "accept;" will accept any packet.</li>
                <li>Matches in an action are evaluated in order with each being AND the previous, and the action is taken if the final result is <i>true</i>. The modifiers <b>or</b> and <b>not</b> can be used to change the logical sense of the next match. The <b>and</b> keyword is allowed for clarity but has no effect.</li><li>Rule parsing stops at the first <b>accept</b> or <b>drop</b>. If it seems like later rules are not being evaluated this is usually why. The best way to fix this is usually to convert an <b>accept</b> into a <b>drop</b> with the inverse logical sense. For example "accept ethertype 0x86dd;" would end rule evaluation for every IPv6 packet, while "drop not ethertype 0x86dd;" would just drop non-IPv6 packets but otherwise continue.</li><li>Match criteria that do not apply, such as IP ports on non-IP packets, evaluate to false.</li><li>If nothing matches, the default action is <b>drop</b>. A network with no rules allows nothing.</li><li>A network can only have 1024 entries (both matches and actions count) in its base rule set and 64 entries in a capability rule set.</li></ul><br /></td>
            </tr>
            <tr><td colspan="2"><h3>Actions</h3></td></tr>
            <tr><td><b>drop</b></td><td>Discard packet and stop evaluating rules (default)</td></tr>
            <tr><td><b>accept</b></td><td>Accept packet and stop evaluating rules</td></tr>
            <tr><td><b>redirect &lt;zt-address&gt;</b></td><td>Redirect packet to ZeroTier address (MACs and payload unchanged)</td></tr>
            <tr><td><b>tee &lt;maxlen&gt; &lt;zt-address&gt;</b></td><td>Send first &lt;=maxlen (or -1 for all) bytes of packet to ZeroTier address and continue</td></tr>
            <tr><td><b>watch &lt;maxlen&gt; &lt;zt-address&gt;</b></td><td>Like <b>tee</b> but drops packets if observer has not recently acknowledged</td></tr>
            <tr><td colspan="2"><h3>Matches</h3></td></tr>
            <tr><td><b>ztsrc &lt;zt-address&gt;</b></td><td>Source ZeroTier (VL1) address</td></tr>
            <tr><td><b>ztdest &lt;zt-address&gt;</b></td><td>Destination ZeroTier (VL1) address</td></tr>
            <tr><td><b>ethertype &lt;type&gt;</b></td><td>Ethernet type code (16-bit, use 0x#### for hex)</td></tr>
            <tr><td><b>iptos &lt;mask&gt; &lt;start[-end]&gt;</b></td><td>Match range of IP TOS field values after masking</td></tr>
            <tr><td><b>ipprotocol &lt;protocol&gt;</b></td><td>Value of IP protocol field (e.g. 6 for TCP)</td></tr>
            <tr><td><b>random &lt;number&gt;</b></td><td>Matches with given probability, range 0.0 to 1.0</td></tr>
            <tr><td><b>macsrc &lt;MAC&gt;</b></td><td>Source Ethernet MAC address (can be specified with or without :)</td></tr>
            <tr><td><b>macdest &lt;MAC&gt;</b></td><td>Destination Ethernet MAC address (can be specified with or without :)</td></tr>
            <tr><td><b>ipsrc &lt;IP/bits&gt;</b></td><td>Source IP address and netmask bits (e.g. 10.0.0.0/8 or 2001:1234::/32)</td></tr>
            <tr><td><b>ipdest &lt;IP/bits&gt;</b></td><td>Destination IP address and netmask bits (e.g. 10.0.0.0/8 or 2001:1234::/32)</td></tr>
            <tr><td><b>icmp &lt;type&gt; &lt;code&gt;</b></td><td>ICMP type and code (use code -1 for types that lack codes or to match any code)</td></tr>
            <tr><td><b>sport &lt;start[-end]&gt;</b></td><td>Source IP port range (TCP, UDP, SCTP, or UDPLite)</td></tr>
            <tr><td><b>dport &lt;start[-end]&gt;</b></td><td>Destination IP port range (TCP, UDP, SCTP, or UDPLite)</td></tr>
            <tr><td><b>framesize &lt;start[-end]&gt;</b></td><td>Ethernet frame size range</td></tr>
            <tr><td><b>chr &lt;characteristic&gt;</b></td><td>Packet characteristic bit (see below)</td></tr>
            <tr><td><b>tand &lt;tag-id&gt; &lt;value&gt;</b></td><td>Bitwise AND of sender and receiver tags equals value</td></tr>
            <tr><td><b>tor &lt;tag-id&gt; &lt;value&gt;</b></td><td>Bitwise OR of sender and receiver tags equals value</td></tr>
            <tr><td><b>txor &lt;tag-id&gt; &lt;value&gt;</b></td><td>Bitwise XOR of sender and receiver tags equals value</td></tr>
            <tr><td><b>tdiff &lt;tag-id&gt; &lt;value&gt;</b></td><td>Difference between sender and receiver tags &lt;= value (use 0 to check equality)</td></tr>
            <tr><td><b>teq &lt;tag-id&gt; &lt;value&gt;</b></td><td>Both sender and receiver tags have the specified value</td></tr><tr><td colspan="2"><h3>Packet Characteristics</h3></td></tr>
            <tr><td><b>inbound</b></td><td>True at receiver and false at sender; use "not chr inbound" for outbound</td></tr>
            <tr><td><b>multicast</b></td><td>True if this is a multicast packet (based on MAC)</td></tr>
            <tr><td><b>broadcast</b></td><td>True for broadcast, equivalent to "macdest ff:ff:ff:ff:ff:ff"</td></tr>
            <tr><td><b>tcp_fin</b></td><td>TCP packet (V4 or V6) and TCP FIN flag is set</td></tr>
            <tr><td><b>tcp_syn</b></td><td>TCP packet (V4 or V6) and TCP SYN flag is set</td></tr>
            <tr><td><b>tcp_rst</b></td><td>TCP packet (V4 or V6) and TCP RST flag is set</td></tr>
            <tr><td><b>tcp_psh</b></td><td>TCP packet (V4 or V6) and TCP PSH flag is set</td></tr>
            <tr><td><b>tcp_ack</b></td><td>TCP packet (V4 or V6) and TCP ACK flag is set</td></tr>
            <tr><td><b>tcp_urg</b></td><td>TCP packet (V4 or V6) and TCP URG flag is set</td></tr>
            <tr><td><b>tcp_ece</b></td><td>TCP packet (V4 or V6) and TCP ECE flag is set</td></tr>
            <tr><td><b>tcp_cwr</b></td><td>TCP packet (V4 or V6) and TCP CWR flag is set</td></tr>
            <tr><td><b>tcp_ns</b></td><td>TCP packet (V4 or V6) and TCP NS flag is set</td></tr>
            <tr><td><b>tcp_rs2</b></td><td>TCP packet (V4 or V6) and TCP reserved bit 2 flag is set</td></tr>
            <tr><td><b>tcp_rs1</b></td><td>TCP packet (V4 or V6) and TCP reserved bit 1 flag is set</td></tr>
            <tr><td><b>tcp_rs0</b></td><td>TCP packet (V4 or V6) and TCP reserved bit 0 flag is set</td></tr>
            <tr><td colspan="2">&nbsp;</td></tr>
          </tbody>
        </table>
      </Accordion>
    </div>

  </div>;
};