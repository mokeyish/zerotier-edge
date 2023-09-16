
import { generate6plane, generateRfc4193 } from './ipv6-generator';


test('test generate rfc4193', () => {
  const networkId = '363c67c55af7c396';
  const memberId = '363c67c55a';
  expect(generateRfc4193(networkId)).toBe('fd36:3c67:c55a:f7c3:9699:93__:____:____');
  expect(generateRfc4193(networkId, memberId)).toBe('fd36:3c67:c55a:f7c3:9699:9336:3c67:c55a');
});

test('test generate 6plane', () => {
  const networkId = '363c67c55af7c396';
  const memberId = '363c67c55a';
  expect(generate6plane(networkId)).toBe('fc6c:cba4:53__:____:____:0000:0000:0001');
  expect(generate6plane(networkId, memberId)).toBe('fc6c:cba4:5336:3c67:c55a:0000:0000:0001');
});