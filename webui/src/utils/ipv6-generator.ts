

export const generateRfc4193 = (networkId: string, memberId?: string) => {
  memberId = memberId ?? '_'.repeat(10);
  const hexAddr = `fd${networkId}9993${memberId}`;
  return hexAddr.match(/(.{4})/g).join(':');
};


export const generate6plane = (networkId: string, memberId?: string) => {
  memberId = memberId ?? '_'.repeat(10);
  const [a, b] = networkId.match(/(.{8})/g).map(x => x.match(/(.{4})/g)); // 
  networkId = a.map((m, i) => [m, b[i]]).map(([m, n]) => (parseInt(m, 16) ^ parseInt(n, 16)).toString(16)).join('');
  const hexAddr = `fc${networkId}${memberId}000000000001`;
  return hexAddr.match(/(.{4})/g).join(':');
};


export default {
  generate6plane,
  generateRfc4193,
};
