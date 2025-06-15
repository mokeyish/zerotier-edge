import fs from 'node:fs';
import openapiTS from 'openapi-typescript';

const generateOpenAPI = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v1 = async () => {
    const schema = await (
      await fetch('https://docs.zerotier.com/openapi/servicev1.json')
    ).json();

    schema['paths']['/controller/network/{networkID}'] = {
      ...schema['paths']['/controller/network/{networkID}'],
      delete: {
        tags: ['controller'],
        summary: 'Delete Network by ID.',
        description: 'Delete a network by its ID.',
        operationId: 'deleteControllerNetwork',
        parameters: [
          {
            name: 'networkID',
            description: 'ID of the network.',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              example: '3e245e31af7a726a',
            },
          },
        ],
        responses: {
          200: {
            description: 'Network Details.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ControllerNetwork',
                },
              },
            },
          },
          401: {
            $ref: '#/components/responses/UnauthorizedError',
          },
        },
      },
    };

    schema['paths']['/controller/network/{networkID}/member/{nodeID}'] = {
      ...schema['paths']['/controller/network/{networkID}/member/{nodeID}'],
      post: {
        tags: ['controller'],
        summary: 'Modify a controller network member',
        operationId: 'updateControllerNetworkMember',
        parameters: [
          {
            name: 'networkID',
            description: 'ID of the network.',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'nodeID',
            description: 'ID of the member node.',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          description: 'Member object JSON',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ControllerNetworkMember',
              },
            },
          },
        },
        responses: {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ControllerNetworkMember',
                },
              },
            },
          },
          401: {
            $ref: '#/components/responses/UnauthorizedError',
          },
        },
      },
      delete: {
        tags: ['controller'],
        summary: 'Delete a controller network member',
        operationId: 'deleteControllerNetworkMember',
        parameters: [
          {
            name: 'networkID',
            description: 'ID of the network.',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'nodeID',
            description: 'ID of the member node.',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ControllerNetworkMember',
                },
              },
            },
          },
          401: {
            $ref: '#/components/responses/UnauthorizedError',
          },
        },
      },
    };

    const output = await openapiTS(schema);

    fs.writeFileSync('src/zerotier-api.d.ts', output);
  };

  const v2 = async () => {
    const schema = await (
      await fetch('https://docs.zerotier.com/openapi/centralv1.json')
    ).json();

    const output = await openapiTS(schema);

    fs.writeFileSync('src/zerotier-api.d.ts', output);
  };

  // await v1();
  // await v2();
};

const downloadRuleCompiler = async () => {
  const scriptUrl = 'https://raw.githubusercontent.com/zerotier/ZeroTierOne/dev/rule-compiler/rule-compiler.js';
  const script = `/* \n * source: ${scriptUrl}\n */\n\n${await (await fetch(scriptUrl)).text()}`.replace('exports.compile = compile;', 'export default { compile };');
  fs.writeFileSync('src/utils/rule-compiler.js', script);
};

await generateOpenAPI();
await downloadRuleCompiler();
