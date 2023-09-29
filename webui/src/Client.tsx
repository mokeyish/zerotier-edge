import type { paths } from './zerotier-api';
import createClient, { FetchResponse } from 'openapi-fetch';
import { Accessor, JSX, createContext, createEffect, createSignal, untrack, useContext, onMount } from 'solid-js';
import { SetStoreFunction, createStore, reconcile } from 'solid-js/store';
import { Member, Network, Status } from './zerotier';
import { useNavigate } from '@solidjs/router';
import { makePersisted } from '@solid-primitives/storage';
import flowRule from './flow-rule.txt?raw';
import RuleCompiler from './utils/rule-compiler';

type UISettings = {
  flowRulesCollapsed: boolean,
  flowRulesCollapsed2: boolean,
  membersCollapsed: boolean, 
  membersHelpCollapsed: boolean,
  permissionsCollapsed: boolean,
  settingsCollapsed: boolean,
  settingsHelpCollapsed: boolean,
  sharingCollapsed: boolean,
}

type Client = {
  authRequired: Accessor<boolean>,
  loading: Accessor<boolean>,
  status: Accessor<Status | undefined>,
  login: (token?: string) => Promise<boolean>,
  logout: () => Promise<void>,
  networks: Accessor<Network[]>,
  createNewNetwork: () => Promise<void>,
  deleteNetwork: () => Promise<void>,
  setCurrentNetwork: (networkId?: string) => Promise<void>,
  currentNetwork: Accessor<Network | undefined>,
  updateNetwork: (networkPart: Partial<Network>) => Promise<void>,
  members: Accessor<Member[]>,
  updateMember: (member: Member, memberPart: Partial<Member>) => Promise<void>,
  deleteMember: (member: Member) => Promise<void>,
  addMember: (nodeId: string) => Promise<void>,
  ui: UISettings,
  setUI: SetStoreFunction<UISettings>
};

const Context = createContext<Client>();

export default (props: { children: JSX.Element }) => {
  const navigate = useNavigate();
  const [ui, setUI] = makePersisted(createStore({
    flowRulesCollapsed: false,
    flowRulesCollapsed2: true,
    membersCollapsed: false, 
    membersHelpCollapsed: true,
    permissionsCollapsed: true,
    settingsCollapsed: false,
    settingsHelpCollapsed: true,
    sharingCollapsed: false,
  }), { name: 'ui' });

  const [token, setToken] = makePersisted(
    createSignal(''),
    { name: 'zt1-token', storage: sessionStorage }
  );
  const [status, setStatus] = createSignal<Status>();
  const [loading, setLoading] = createSignal(true);

  const [networks0, setNetworks] = createStore<Network[]>([]);
  const [currentNetwork0, setCurrentNetwork] = createStore<{ currentNetwork?: Network }>({ currentNetwork: undefined  });
  const [members0, setMembers] = createStore<Member[]>([]);
  const networks = () => networks0;
  const members = () => members0;
  const currentNetwork = () => currentNetwork0.currentNetwork;
  const authRequired = () => !loading() && !status();
  const baseUrl = `${location.pathname}api/v1`;


  let client = createClient<paths>({
    baseUrl, headers: {
      'X-ZT1-AUTH': token() // 
    }
  });

  createEffect(() => {
    client = createClient<paths>({
      baseUrl, headers: {
        'X-ZT1-AUTH': token() // 
      }
    });
  });

  const mapRes = <T,>(res: FetchResponse<T>) => {
    if (res.response.ok) {
      return res.data;
    }
    if (res.response.status === 401) {
      setStatus(undefined);
    }
    return undefined;
  };

  const computeMemberActive = (member: Partial<Member> ): Member => ({ 
    active:  status()?.address === member.nodeId || (Date.now() - (member.lastSeen ?? 0)) / 1000 < 60, // 1 minutes.
    ...member
  });

  const updateNetwork = async (networkPart: Partial<Network>) => {
    const network = untrack(currentNetwork);
    if (network) {
      const updatedNetwork = mapRes((await client.POST('/network/{networkID}', {
        params: {
          path: {
            networkID: network.id
          }
        },
        body: networkPart
      })));
      setCurrentNetwork('currentNetwork', reconcile(updatedNetwork));
      setNetworks(networks().findIndex(n => n.id === network.id), reconcile(updatedNetwork));
    }
  };

  const updateMember = async (member: Member, memberPart: Partial<Member>) => {
    const memberId = member.nodeId;
    const updatedMember = computeMemberActive(mapRes((await client.POST('/network/{networkID}/member/{memberID}', {
      params: {
        path: {
          networkID: member.networkId,
          memberID: memberId
        }
      },
      body: {
        nodeId: memberId,
        ...memberPart
      },
    }))));

    setMembers(members().findIndex(n => n.nodeId === memberId), reconcile(updatedMember));
  };

  const addMember = async (nodeId: string) => {
    const member = mapRes(await client.POST('/network/{networkID}/member/{memberID}', {
      params: {
        path: {
          networkID: currentNetwork().id,
          memberID: nodeId
        }
      },
      body: {
        config: {
          authorized: true
        },
        hidden: false,
      }
    }));

    setMembers(reconcile(
      [
        computeMemberActive(member),
        ...members()
      ],
      { key: 'nodeId' }
    ));
  };

  const createNewNetwork = async () => {
    const generateNeworkName = () => {
      while (true) {
        const name = generateStupidName().toLowerCase();
        if (networks().every(n => n.config.name !== name)) {
          return name;
        }
      }
    };

    const name = generateNeworkName();
    const ipv4Subnet = ipv4Subnets[Math.floor(Math.random() * ipv4Subnets.length)];
    
    const rules = [];
    const capsMap: { [k: string]: Record<string, never> } = {};
    const tagsMap: { [k: string]: Record<string, never> } = {};

    RuleCompiler.compile(flowRule, rules, capsMap, tagsMap);

    const tags = Object.values(tagsMap);
    const capabilities = Object.values(capsMap);
    const capabilitiesByName = Object.fromEntries(Object.entries(capsMap).map(([n, v]) => [n, v.id] ));
    const tagsByName = tagsMap;

    const net = {
      rulesSource: flowRule,
      config: {
        name: name,
        private: true,
        enableBroadcast: true,
        ipAssignmentPools: [
          ipv4Subnet.range
        ],
        rules,
        tags,
        capabilities,
        routes: [
          { target: ipv4Subnet.target, via: null }
        ],
        v4AssignMode: {
          zt: true
        },
        v6AssignMode: {
          '6plane': false,
          rfc4193: false,
          zt: false
        }
      },
      ui: {
        membersHelpCollapsed: true,
        rulesHelpCollapsed: true,
        settingsHelpCollapsed: true,
        v4EasyMode: true
      },
      capabilitiesByName,
      tagsByName
    } satisfies Partial<Network>;

    const newNet = mapRes(await client.POST('/network', {
      body: net as unknown as Record<string, never>
    }));

    setNetworks(reconcile([
      ...networks(), newNet
    ], { key: 'id' }));
  };

  const deleteNetwork = async () => {
    const network = currentNetwork();
    if (network) {
      mapRes(await client.DELETE('/network/{networkID}', {
        params: {
          path: {
            networkID: network.id
          }
        }
      }));
      setNetworks(reconcile(networks().filter(n => n.id !== network.id), { key: 'id' }));
      navigate('/');
    }
  };

  const deleteMember = async (member: Member) => {
    mapRes(await client.DELETE('/network/{networkID}/member/{memberID}', {
      params: {
        path: {
          networkID: member.networkId,
          memberID: member.nodeId
        }
      }
    }));
    setMembers(reconcile(members().filter(m => m.nodeId !== member.nodeId), { key: 'nodeId' }));
    await refreshNetworkMembers();
  };

  const refreshNetworkMembers = async (network?: Network) => {
    network = network ?? currentNetwork();
    if (network) {
      const members = mapRes(await client.GET('/network/{networkID}/member', {
        params: {
          path: {
            networkID: network.id,
          }
        }
      }))?.map(m => computeMemberActive(m)) ?? [];
      setMembers(reconcile(members, { key: 'nodeId' }));
    }
  };

  const refreshNetworkInfo = async (network: Network | string) => {
    const networkId = typeof network === 'string' ? network : network.id;
    const updatedNetwork = mapRes(await client.GET('/network/{networkID}', {
      params: {
        path: {
          networkID: networkId
        }
      }
    }));
    if (updatedNetwork) {
      setCurrentNetwork('currentNetwork', reconcile(updatedNetwork));
      setNetworks(networks().findIndex(n => n.id === networkId), reconcile(updatedNetwork));
    } else {
      setCurrentNetwork('currentNetwork', updatedNetwork);
    }
  };

  const refreshNetworkInfos = async () => {
    setNetworks(reconcile(mapRes(await client.GET('/network', {})) ?? [], { key: 'id' }));
  };

  setInterval(async () => {
    if (untrack(authRequired)) {
      return;
    }
    const network = untrack(currentNetwork);
    if (network) {
      await refreshNetworkInfo(network);
      await refreshNetworkMembers(network);
    } else {
      await refreshNetworkInfos();
    }
  }, 3 * 1000);


  const login = async (token?: string) => {
    if (token) {
      setToken(token);
    }
    const status = mapRes(await client.GET('/status', {}));
    if (status) {
      await refreshNetworkInfos();
      setStatus(status as unknown as Status);
      return true;
    } else {

      return false;
    }
  };

  const logout = async () => {
    setToken('');
  };


  onMount(async () => {
    if (await login()) {
      await refreshNetworkInfos();
    }
    setLoading(false);
  });

  const provider: Client = {
    loading,
    authRequired,
    status,
    login, logout,
    networks,
    currentNetwork,
    updateNetwork,
    members,
    updateMember, 
    addMember,
    deleteMember,
    setCurrentNetwork: async (networkId) => {
      if (networkId) {
        await refreshNetworkInfo(networkId);
        await refreshNetworkMembers();
      } else {
        setCurrentNetwork('currentNetwork', undefined);
      }
    },
    createNewNetwork, 
    deleteNetwork,
    ui,
    setUI
  };
  return <Context.Provider value={provider}>
    {props.children}
  </Context.Provider>;
};

export const useClient = () => useContext(Context);


const generateStupidName = () => {
  const adjectives = ['Black', 'White', 'Gray', 'Brown', 'Red', 'Pink', 'Crimson', 'Carnelian', 'Orange', 'Yellow', 'Ivory', 'Cream', 'Green', 'Viridian', 'Aquamarine', 'Cyan', 'Blue', 'Cerulean', 'Azure', 'Indigo', 'Navy', 'Violet', 'Purple', 'Lavender', 'Magenta', 'Rainbow', 'Iridescent', 'Spectrum', 'Prism', 'Bold', 'Vivid', 'Pale', 'Clear', 'Glass', 'Translucent', 'Misty', 'Dark', 'Light', 'Gold', 'Silver', 'Copper', 'Bronze', 'Steel', 'Iron', 'Brass', 'Mercury', 'Zinc', 'Chrome', 'Platinum', 'Titanium', 'Nickel', 'Lead', 'Pewter', 'Rust', 'Metal', 'Stone', 'Quartz', 'Granite', 'Marble', 'Alabaster', 'Agate', 'Jasper', 'Pebble', 'Pyrite', 'Crystal', 'Geode', 'Obsidian', 'Mica', 'Flint', 'Sand', 'Gravel', 'Boulder', 'Basalt', 'Ruby', 'Beryl', 'Scarlet', 'Citrine', 'Sulpher', 'Topaz', 'Amber', 'Emerald', 'Malachite', 'Jade', 'Abalone', 'Lapis', 'Sapphire', 'Diamond', 'Peridot', 'Gem', 'Jewel', 'Bevel', 'Coral', 'Jet', 'Ebony', 'Wood', 'Tree', 'Cherry', 'Maple', 'Cedar', 'Branch', 'Bramble', 'Rowan', 'Ash', 'Fir', 'Pine', 'Cactus', 'Alder', 'Grove', 'Forest', 'Jungle', 'Palm', 'Bush', 'Mulberry', 'Juniper', 'Vine', 'Ivy', 'Rose', 'Lily', 'Tulip', 'Daffodil', 'Honeysuckle', 'Fuschia', 'Hazel', 'Walnut', 'Almond', 'Lime', 'Lemon', 'Apple', 'Blossom', 'Bloom', 'Crocus', 'Rose', 'Buttercup', 'Dandelion', 'Iris', 'Carnation', 'Fern', 'Root', 'Branch', 'Leaf', 'Seed', 'Flower', 'Petal', 'Pollen', 'Orchid', 'Mangrove', 'Cypress', 'Sequoia', 'Sage', 'Heather', 'Snapdragon', 'Daisy', 'Mountain', 'Hill', 'Alpine', 'Chestnut', 'Valley', 'Glacier', 'Forest', 'Grove', 'Glen', 'Tree', 'Thorn', 'Stump', 'Desert', 'Canyon', 'Dune', 'Oasis', 'Mirage', 'Well', 'Spring', 'Meadow', 'Field', 'Prairie', 'Grass', 'Tundra', 'Island', 'Shore', 'Sand', 'Shell', 'Surf', 'Wave', 'Foam', 'Tide', 'Lake', 'River', 'Brook', 'Stream', 'Pool', 'Pond', 'Sun', 'Sprinkle', 'Shade', 'Shadow', 'Rain', 'Cloud', 'Storm', 'Hail', 'Snow', 'Sleet', 'Thunder', 'Lightning', 'Wind', 'Hurricane', 'Typhoon', 'Dawn', 'Sunrise', 'Morning', 'Noon', 'Twilight', 'Evening', 'Sunset', 'Midnight', 'Night', 'Sky', 'Star', 'Stellar', 'Comet', 'Nebula', 'Quasar', 'Solar', 'Lunar', 'Planet', 'Meteor', 'Sprout', 'Pear', 'Plum', 'Kiwi', 'Berry', 'Apricot', 'Peach', 'Mango', 'Pineapple', 'Coconut', 'Olive', 'Ginger', 'Root', 'Plain', 'Fancy', 'Stripe', 'Spot', 'Speckle', 'Spangle', 'Ring', 'Band', 'Blaze', 'Paint', 'Pinto', 'Shade', 'Tabby', 'Brindle', 'Patch', 'Calico', 'Checker', 'Dot', 'Pattern', 'Glitter', 'Glimmer', 'Shimmer', 'Dull', 'Dust', 'Dirt', 'Glaze', 'Scratch', 'Quick', 'Swift', 'Fast', 'Slow', 'Clever', 'Fire', 'Flicker', 'Flash', 'Spark', 'Ember', 'Coal', 'Flame', 'Chocolate', 'Vanilla', 'Sugar', 'Spice', 'Cake', 'Pie', 'Cookie', 'Candy', 'Caramel', 'Spiral', 'Round', 'Jelly', 'Square', 'Narrow', 'Long', 'Short', 'Small', 'Tiny', 'Big', 'Giant', 'Great', 'Atom', 'Peppermint', 'Mint', 'Butter', 'Fringe', 'Rag', 'Quilt', 'Truth', 'Lie', 'Holy', 'Curse', 'Noble', 'Sly', 'Brave', 'Shy', 'Lava', 'Foul', 'Leather', 'Fantasy', 'Keen', 'Luminous', 'Feather', 'Sticky', 'Gossamer', 'Cotton', 'Rattle', 'Silk', 'Satin', 'Cord', 'Denim', 'Flannel', 'Plaid', 'Wool', 'Linen', 'Silent', 'Flax', 'Weak', 'Valiant', 'Fierce', 'Gentle', 'Rhinestone', 'Splash', 'North', 'South', 'East', 'West', 'Summer', 'Winter', 'Autumn', 'Spring', 'Season', 'Equinox', 'Solstice', 'Paper', 'Motley', 'Torch', 'Ballistic', 'Rampant', 'Shag', 'Freckle', 'Wild', 'Free', 'Chain', 'Sheer', 'Crazy', 'Mad', 'Candle', 'Ribbon', 'Lace', 'Notch', 'Wax', 'Shine', 'Shallow', 'Deep', 'Bubble', 'Harvest', 'Fluff', 'Venom', 'Boom', 'Slash', 'Rune', 'Cold', 'Quill', 'Love', 'Hate', 'Garnet', 'Zircon', 'Power', 'Bone', 'Void', 'Horn', 'Glory', 'Cyber', 'Nova', 'Hot', 'Helix', 'Cosmic', 'Quark', 'Quiver', 'Holly', 'Clover', 'Polar', 'Regal', 'Ripple', 'Ebony', 'Wheat', 'Phantom', 'Dew', 'Chisel', 'Crack', 'Chatter', 'Laser', 'Foil', 'Tin', 'Clever', 'Treasure', 'Maze', 'Twisty', 'Curly', 'Fortune', 'Fate', 'Destiny', 'Cute', 'Slime', 'Ink', 'Disco', 'Plume', 'Time', 'Psychadelic', 'Relic', 'Fossil', 'Water', 'Savage', 'Ancient', 'Rapid', 'Road', 'Trail', 'Stitch', 'Button', 'Bow', 'Nimble', 'Zest', 'Sour', 'Bitter', 'Phase', 'Fan', 'Frill', 'Plump', 'Pickle', 'Mud', 'Puddle', 'Pond', 'River', 'Spring', 'Stream', 'Battle', 'Arrow', 'Plume', 'Roan', 'Pitch', 'Tar', 'Cat', 'Dog', 'Horse', 'Lizard', 'Bird', 'Fish', 'Saber', 'Scythe', 'Sharp', 'Soft', 'Razor', 'Neon', 'Dandy', 'Weed', 'Swamp', 'Marsh', 'Bog', 'Peat', 'Moor', 'Muck', 'Mire', 'Grave', 'Fair', 'Just', 'Brick', 'Puzzle', 'Skitter', 'Prong', 'Fork', 'Dent', 'Dour', 'Warp', 'Luck', 'Coffee', 'Split', 'Chip', 'Hollow', 'Heavy', 'Legend', 'Hickory', 'Mesquite', 'Nettle', 'Rogue', 'Charm', 'Prickle', 'Bead', 'Sponge', 'Whip', 'Bald', 'Frost', 'Fog', 'Oil', 'Veil', 'Cliff', 'Volcano', 'Rift', 'Maze', 'Proud', 'Dew', 'Mirror', 'Shard', 'Salt', 'Pepper', 'Honey', 'Thread', 'Bristle', 'Ripple', 'Glow', 'Zenith'];

  const nouns = ['head', 'crest', 'crown', 'tooth', 'fang', 'horn', 'frill', 'skull', 'bone', 'tongue', 'throat', 'voice', 'nose', 'snout', 'chin', 'eye', 'sight', 'seer', 'speaker', 'singer', 'song', 'chanter', 'howler', 'chatter', 'shrieker', 'shriek', 'jaw', 'bite', 'biter', 'neck', 'shoulder', 'fin', 'wing', 'arm', 'lifter', 'grasp', 'grabber', 'hand', 'paw', 'foot', 'finger', 'toe', 'thumb', 'talon', 'palm', 'touch', 'racer', 'runner', 'hoof', 'fly', 'flier', 'swoop', 'roar', 'hiss', 'hisser', 'snarl', 'dive', 'diver', 'rib', 'chest', 'back', 'ridge', 'leg', 'legs', 'tail', 'beak', 'walker', 'lasher', 'swisher', 'carver', 'kicker', 'roarer', 'crusher', 'spike', 'shaker', 'charger', 'hunter', 'weaver', 'crafter', 'binder', 'scribe', 'muse', 'snap', 'snapper', 'slayer', 'stalker', 'track', 'tracker', 'scar', 'scarer', 'fright', 'killer', 'death', 'doom', 'healer', 'saver', 'friend', 'foe', 'guardian', 'thunder', 'lightning', 'cloud', 'storm', 'forger', 'scale', 'hair', 'braid', 'nape', 'belly', 'thief', 'stealer', 'reaper', 'giver', 'taker', 'dancer', 'player', 'gambler', 'twister', 'turner', 'painter', 'dart', 'drifter', 'sting', 'stinger', 'venom', 'spur', 'ripper', 'swallow', 'devourer', 'knight', 'lady', 'lord', 'queen', 'king', 'master', 'mistress', 'prince', 'princess', 'duke', 'dutchess', 'samurai', 'ninja', 'knave', 'slave', 'servant', 'sage', 'wizard', 'witch', 'warlock', 'warrior', 'jester', 'paladin', 'bard', 'trader', 'sword', 'shield', 'knife', 'dagger', 'arrow', 'bow', 'fighter', 'bane', 'follower', 'leader', 'scourge', 'watcher', 'cat', 'panther', 'tiger', 'cougar', 'puma', 'jaguar', 'ocelot', 'lynx', 'lion', 'leopard', 'ferret', 'weasel', 'wolverine', 'bear', 'raccoon', 'dog', 'wolf', 'kitten', 'puppy', 'cub', 'fox', 'hound', 'terrier', 'coyote', 'hyena', 'jackal', 'pig', 'horse', 'donkey', 'stallion', 'mare', 'zebra', 'antelope', 'gazelle', 'deer', 'buffalo', 'bison', 'boar', 'elk', 'whale', 'dolphin', 'shark', 'fish', 'minnow', 'salmon', 'ray', 'fisher', 'otter', 'gull', 'duck', 'goose', 'crow', 'raven', 'bird', 'eagle', 'raptor', 'hawk', 'falcon', 'moose', 'heron', 'owl', 'stork', 'crane', 'sparrow', 'robin', 'parrot', 'cockatoo', 'carp', 'lizard', 'gecko', 'iguana', 'snake', 'python', 'viper', 'boa', 'condor', 'vulture', 'spider', 'fly', 'scorpion', 'heron', 'oriole', 'toucan', 'bee', 'wasp', 'hornet', 'rabbit', 'bunny', 'hare', 'brow', 'mustang', 'ox', 'piper', 'soarer', 'flasher', 'moth', 'mask', 'hide', 'hero', 'antler', 'chill', 'chiller', 'gem', 'ogre', 'myth', 'elf', 'fairy', 'pixie', 'dragon', 'griffin', 'unicorn', 'pegasus', 'sprite', 'fancier', 'chopper', 'slicer', 'skinner', 'butterfly', 'legend', 'wanderer', 'rover', 'raver', 'loon', 'lancer', 'glass', 'glazer', 'flame', 'crystal', 'lantern', 'lighter', 'cloak', 'bell', 'ringer', 'keeper', 'centaur', 'bolt', 'catcher', 'whimsey', 'quester', 'rat', 'mouse', 'serpent', 'wyrm', 'gargoyle', 'thorn', 'whip', 'rider', 'spirit', 'sentry', 'bat', 'beetle', 'burn', 'cowl', 'stone', 'gem', 'collar', 'mark', 'grin', 'scowl', 'spear', 'razor', 'edge', 'seeker', 'jay', 'ape', 'monkey', 'gorilla', 'koala', 'kangaroo', 'yak', 'sloth', 'ant', 'roach', 'weed', 'seed', 'eater', 'razor', 'shirt', 'face', 'goat', 'mind', 'shift', 'rider', 'face', 'mole', 'vole', 'pirate', 'llama', 'stag', 'bug', 'cap', 'boot', 'drop', 'hugger', 'sargent', 'snagglefoot', 'carpet', 'curtain'];

  const adj = adjectives[Math.floor(adjectives.length * Math.random())];
  const name = nouns[Math.floor(nouns.length * Math.random())];
  return `${adj}_${name}`;
};

export type Ipv4SubnetInfo = {
  name: string,
  target: string,
  range: {
    ipRangeStart: string,
    ipRangeEnd: string
  }
}

const getIpv4Subnet = (name: string): Ipv4SubnetInfo => {
  const astreriskCount = [...name].filter(c => c === '*').length;
  const lastIdx = name.lastIndexOf('*');
  let start = name;
  let end = name;
  if (lastIdx >= 0) {
    start = `${name.substring(0, lastIdx)}1${name.substring(lastIdx + 1)}`;
    end = `${name.substring(0, lastIdx)}254${name.substring(lastIdx + 1)}`;
  }
  start = start.replaceAll('*', '0');
  end = end.replaceAll('*', '255');

  return {
    name,
    target: `${name.replaceAll('*', '0')}/${8 * astreriskCount}`,
    range: {
      ipRangeStart: start,
      ipRangeEnd: end
    }
  };
};


export const ipv4Subnets = [
  '10.147.17.*',
  '10.147.18.*',
  '10.147.19.*',
  '10.147.20.*',

  '10.144.*.*',
  '10.241.*.*',
  '10.242.*.*',
  '10.243.*.*',

  '10.244.*.*',
  '172.22.*.*',
  '172.23.*.*',
  '172.24.*.*',

  '172.25.*.*',
  '172.26.*.*',
  '172.27.*.*',
  '172.28.*.*',

  '172.29.*.*',
  '172.30.*.*',
  '192.168.191.*',
  '192.168.192.*',

  '192.168.193.*',
  '192.168.194.*',
  '192.168.195.*',
  '192.168.196.*'
].map(getIpv4Subnet);

